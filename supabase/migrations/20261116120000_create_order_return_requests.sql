-- Migration: Create order_return_requests table with hardened RLS, atomic concurrency locking,
-- reserved return references, server-side photo path validation, and durable notification outbox.
-- Created for Phase 5 Return / Issue Request System Security Hardening
-- Note: Prepared strictly as local migration. Do NOT execute against remote Supabase in read-only preflight.

-- 1. Create table with strict column types and constraints
CREATE TABLE IF NOT EXISTS public.order_return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(64) UNIQUE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_number VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('return_sealed', 'damaged', 'leaking', 'wrong_item', 'defective', 'other')),
    product_name VARCHAR(255) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    photo_urls TEXT[] DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'resolved')),
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security
ALTER TABLE public.order_return_requests ENABLE ROW LEVEL SECURITY;

-- 3. Privilege Revocations: Direct table-level write operations are strictly revoked
-- Order return request creation MUST happen exclusively through the authoritative submit_return_request RPC
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.order_return_requests FROM PUBLIC, anon;
REVOKE INSERT, DELETE, TRUNCATE ON public.order_return_requests FROM authenticated;

-- Drop legacy policies
DROP POLICY IF EXISTS "Customers can submit return requests" ON public.order_return_requests;
DROP POLICY IF EXISTS "Users can view own return requests" ON public.order_return_requests;
DROP POLICY IF EXISTS "Admins have full access to return requests" ON public.order_return_requests;
DROP POLICY IF EXISTS "Only admins can update return requests" ON public.order_return_requests;
DROP POLICY IF EXISTS "Only admins can delete return requests" ON public.order_return_requests;

-- 4. Strict RLS Policies

-- Policy 1: Customer Read (Authenticated users can view only their own requests by normalized email, or admin)
CREATE POLICY "Users can view own return requests"
    ON public.order_return_requests
    FOR SELECT
    TO authenticated
    USING (
        lower(trim(customer_email)) = lower(trim(auth.jwt() ->> 'email'))
        OR public.is_admin()
    );

-- Policy 2: Admin Updates (Only administrators can change status, resolution timestamp, or add admin notes)
CREATE POLICY "Only admins can update return requests"
    ON public.order_return_requests
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Policy 3: Admin Deletions (Only administrators can delete records)
CREATE POLICY "Only admins can delete return requests"
    ON public.order_return_requests
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 5. Performance & Normalization Indexes
CREATE INDEX IF NOT EXISTS idx_return_requests_order_number ON public.order_return_requests(order_number);
CREATE INDEX IF NOT EXISTS idx_return_requests_customer_email ON public.order_return_requests(lower(trim(customer_email)));
CREATE INDEX IF NOT EXISTS idx_return_requests_reference_number ON public.order_return_requests(reference_number);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.order_return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_requests_created_at ON public.order_return_requests(created_at DESC);

-- Ensure pgcrypto extension is active for cryptographic random token generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 6. Reference Reservation Table (Task 1: Pre-Upload Reference Alignment)
-- Holds unique reference reservations generated server-side before customer evidence photos are uploaded.
CREATE TABLE IF NOT EXISTS public.return_reference_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(64) UNIQUE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    reservation_token VARCHAR(128) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.return_reference_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.return_reference_reservations FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_reservations_ref_num ON public.return_reference_reservations(reference_number);
CREATE INDEX IF NOT EXISTS idx_reservations_email ON public.return_reference_reservations(lower(trim(customer_email)));
CREATE INDEX IF NOT EXISTS idx_reservations_order_num ON public.return_reference_reservations(order_number);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON public.return_reference_reservations(expires_at);

-- 7. Initialization RPC: reserve_return_reference
-- Authoritatively validates order and customer ownership, acquires advisory transaction locks,
-- enforces rate limiting, and reserves an official reference number for evidence upload.
CREATE OR REPLACE FUNCTION public.reserve_return_reference(
    p_order_number text,
    p_customer_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean_order text;
    v_clean_email text;
    v_lock_1 text;
    v_lock_2 text;
    v_recent_count int;
    v_active_reservations int;
    v_order record;
    v_reference text;
    v_token text;
    v_expires_at timestamptz;
BEGIN
    -- Input normalization
    v_clean_order := upper(trim(COALESCE(p_order_number, '')));
    v_clean_email := lower(trim(COALESCE(p_customer_email, '')));

    IF length(v_clean_order) < 3 OR length(v_clean_order) > 64 OR v_clean_order !~ '^[A-Za-z0-9\-_]+$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_ORDER_NUMBER',
            'error', 'Please provide a valid order reference number.'
        );
    END IF;

    IF length(v_clean_email) < 5 OR v_clean_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_EMAIL',
            'error', 'Please provide a valid customer correspondence email.'
        );
    END IF;

    -- Advisory Locking in consistent lexicographical order
    IF ('order:' || v_clean_order) < ('email:' || v_clean_email) THEN
        v_lock_1 := 'order:' || v_clean_order;
        v_lock_2 := 'email:' || v_clean_email;
    ELSE
        v_lock_1 := 'email:' || v_clean_email;
        v_lock_2 := 'order:' || v_clean_order;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_lock_1));
    IF v_lock_1 <> v_lock_2 THEN
        PERFORM pg_advisory_xact_lock(hashtext(v_lock_2));
    END IF;

    -- Rate limiting check: Maximum 3 active submissions or reservations per hour
    SELECT count(*) INTO v_recent_count
    FROM public.order_return_requests
    WHERE (lower(trim(customer_email)) = v_clean_email OR order_number = v_clean_order)
      AND created_at > (timezone('utc'::text, now()) - interval '1 hour');

    SELECT count(*) INTO v_active_reservations
    FROM public.return_reference_reservations
    WHERE (lower(trim(customer_email)) = v_clean_email OR order_number = v_clean_order)
      AND created_at > (timezone('utc'::text, now()) - interval '1 hour')
      AND used_at IS NULL
      AND expires_at > timezone('utc'::text, now());

    IF (v_recent_count + v_active_reservations) >= 3 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'RATE_LIMITED',
            'error', 'Submission limit reached. For security, please wait before submitting another request or contact our atelier directly.'
        );
    END IF;

    -- Order Existence & Customer Authorization Verification
    SELECT 
        o.id,
        o.order_number,
        o.user_id,
        sa.email AS shipping_email,
        u.email AS user_email
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id
    LEFT JOIN auth.users u ON u.id = o.user_id
    WHERE o.order_number = v_clean_order
    LIMIT 1;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'VERIFICATION_FAILED',
            'error', 'Unable to verify order with the provided details. Please check your order reference and correspondence email.'
        );
    END IF;

    IF auth.uid() IS NOT NULL THEN
        IF auth.uid() <> v_order.user_id 
           AND lower(trim(COALESCE(auth.jwt() ->> 'email', ''))) <> lower(trim(COALESCE(v_order.shipping_email, v_order.user_email, '')))
           AND NOT public.is_admin() THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'VERIFICATION_FAILED',
                'error', 'Unable to verify order with the provided details. Please check your order reference and correspondence email.'
            );
        END IF;
    ELSE
        IF v_clean_email <> lower(trim(COALESCE(v_order.shipping_email, v_order.user_email, ''))) THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'VERIFICATION_FAILED',
                'error', 'Unable to verify order with the provided details. Please check your order reference and correspondence email.'
            );
        END IF;
    END IF;

    -- Generate Cryptographic Reference & Reservation Token
    v_reference := 'RET-' || upper(to_hex(extract(epoch from now())::bigint)) || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    v_token := encode(gen_random_bytes(16), 'hex');
    v_expires_at := timezone('utc'::text, now()) + interval '30 minutes';

    -- Insert Reservation Record
    INSERT INTO public.return_reference_reservations (
        reference_number,
        order_id,
        order_number,
        customer_email,
        reservation_token,
        expires_at
    ) VALUES (
        v_reference,
        v_order.id,
        v_order.order_number,
        v_clean_email,
        v_token,
        v_expires_at
    );

    RETURN jsonb_build_object(
        'success', true,
        'reference_number', v_reference,
        'reservation_token', v_token,
        'order_number', v_order.order_number,
        'expires_at', v_expires_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_return_reference(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_return_reference(text, text) TO anon, authenticated;

-- 8. Authoritative Submission RPC: submit_return_request
-- Enforces server-side photo path validation, reservation reconciliation, rate limiting, and insertion.
CREATE OR REPLACE FUNCTION public.submit_return_request(
    p_order_number text,
    p_customer_email text,
    p_customer_name text DEFAULT NULL,
    p_request_type text DEFAULT 'return_sealed',
    p_product_name text DEFAULT '',
    p_reason text DEFAULT '',
    p_description text DEFAULT '',
    p_photo_paths text[] DEFAULT '{}',
    p_reference_number text DEFAULT NULL,
    p_reservation_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean_order text;
    v_clean_email text;
    v_clean_name text;
    v_clean_product text;
    v_clean_reason text;
    v_clean_desc text;
    v_clean_type text;
    v_clean_ref text;
    v_clean_token text;
    v_lock_1 text;
    v_lock_2 text;
    v_recent_count int;
    v_order record;
    v_reservation record;
    v_reference text;
    v_photo_path text;
    v_inserted_id uuid;
    i int;
BEGIN
    -- A. Input Hygiene & Normalization
    v_clean_order := upper(trim(COALESCE(p_order_number, '')));
    v_clean_email := lower(trim(COALESCE(p_customer_email, '')));
    v_clean_name := trim(COALESCE(p_customer_name, ''));
    v_clean_product := trim(COALESCE(p_product_name, ''));
    v_clean_reason := trim(COALESCE(p_reason, ''));
    v_clean_desc := trim(COALESCE(p_description, ''));
    v_clean_type := lower(trim(COALESCE(p_request_type, '')));
    v_clean_ref := upper(trim(COALESCE(p_reference_number, '')));
    v_clean_token := trim(COALESCE(p_reservation_token, ''));

    IF length(v_clean_order) < 3 OR length(v_clean_order) > 64 OR v_clean_order !~ '^[A-Za-z0-9\-_]+$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_ORDER_NUMBER',
            'error', 'Please provide a valid order reference number.'
        );
    END IF;

    IF length(v_clean_email) < 5 OR v_clean_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_EMAIL',
            'error', 'Please provide a valid customer correspondence email.'
        );
    END IF;

    IF v_clean_type NOT IN ('return_sealed', 'damaged', 'leaking', 'wrong_item', 'defective', 'other') THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_REQUEST_TYPE',
            'error', 'Invalid return request category selected.'
        );
    END IF;

    IF length(v_clean_product) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'MISSING_PRODUCT',
            'error', 'Please specify the fragrance creation affected.'
        );
    END IF;

    IF length(v_clean_desc) < 10 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'DESCRIPTION_TOO_SHORT',
            'error', 'Please provide at least 10 characters describing the issue.'
        );
    END IF;

    -- B. Deterministic Transaction-Level Advisory Locking
    IF ('order:' || v_clean_order) < ('email:' || v_clean_email) THEN
        v_lock_1 := 'order:' || v_clean_order;
        v_lock_2 := 'email:' || v_clean_email;
    ELSE
        v_lock_1 := 'email:' || v_clean_email;
        v_lock_2 := 'order:' || v_clean_order;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_lock_1));
    IF v_lock_1 <> v_lock_2 THEN
        PERFORM pg_advisory_xact_lock(hashtext(v_lock_2));
    END IF;

    -- C. Server-Side Rate Limiting (Strictly 3 completed submissions per hour)
    SELECT count(*) INTO v_recent_count
    FROM public.order_return_requests
    WHERE (lower(trim(customer_email)) = v_clean_email OR order_number = v_clean_order)
      AND created_at > (timezone('utc'::text, now()) - interval '1 hour');

    IF v_recent_count >= 3 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'RATE_LIMITED',
            'error', 'Submission limit reached. For security, please wait before submitting another request or contact our atelier directly.'
        );
    END IF;

    -- D. Reservation Verification or Standalone Generation
    IF length(v_clean_ref) > 0 THEN
        SELECT id, reference_number, order_number, customer_email, expires_at, used_at
        INTO v_reservation
        FROM public.return_reference_reservations
        WHERE reference_number = v_clean_ref
          AND reservation_token = v_clean_token
        LIMIT 1;

        IF v_reservation.id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'INVALID_RESERVATION',
                'error', 'Invalid reservation reference or security token.'
            );
        END IF;

        IF v_reservation.used_at IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'RESERVATION_ALREADY_USED',
                'error', 'This reservation reference has already been submitted.'
            );
        END IF;

        IF v_reservation.expires_at < timezone('utc'::text, now()) THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'RESERVATION_EXPIRED',
                'error', 'Reservation reference has expired. Please initiate a new request.'
            );
        END IF;

        IF v_reservation.order_number <> v_clean_order OR lower(trim(v_reservation.customer_email)) <> v_clean_email THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'RESERVATION_MISMATCH',
                'error', 'Reservation details do not match the submitted order.'
            );
        END IF;

        v_reference := v_reservation.reference_number;
    ELSE
        -- Fallback standalone reference generation if submitted without pre-reservation
        v_reference := 'RET-' || upper(to_hex(extract(epoch from now())::bigint)) || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    END IF;

    -- E. Order Existence & Customer Ownership Verification
    SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.status,
        o.payment_status,
        sa.email AS shipping_email,
        u.email AS user_email
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id
    LEFT JOIN auth.users u ON u.id = o.user_id
    WHERE o.order_number = v_clean_order
    LIMIT 1;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'VERIFICATION_FAILED',
            'error', 'Unable to verify order with the provided details. Please check your order reference and correspondence email.'
        );
    END IF;

    IF auth.uid() IS NOT NULL THEN
        IF auth.uid() <> v_order.user_id 
           AND lower(trim(COALESCE(auth.jwt() ->> 'email', ''))) <> lower(trim(COALESCE(v_order.shipping_email, v_order.user_email, '')))
           AND NOT public.is_admin() THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'VERIFICATION_FAILED',
                'error', 'Unable to verify order with the provided details. Please check your order reference and correspondence email.'
            );
        END IF;
    ELSE
        IF v_clean_email <> lower(trim(COALESCE(v_order.shipping_email, v_order.user_email, ''))) THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'VERIFICATION_FAILED',
                'error', 'Unable to verify order with the provided details. Please check your order reference and correspondence email.'
            );
        END IF;
    END IF;

    -- F. Server-Side Photo Path Validation (Task 2)
    -- Enforces that every photo path belongs to the assigned return reference and has a valid image format.
    IF p_photo_paths IS NOT NULL AND cardinality(p_photo_paths) > 0 THEN
        IF cardinality(p_photo_paths) > 3 THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'INVALID_PHOTO_ATTACHMENTS',
                'error', 'A maximum of 3 photographic evidence attachments are permitted.'
            );
        END IF;

        FOR i IN 1..cardinality(p_photo_paths) LOOP
            v_photo_path := trim(COALESCE(p_photo_paths[i], ''));

            IF length(v_photo_path) = 0 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'code', 'INVALID_PHOTO_ATTACHMENTS',
                    'error', 'Attached evidence path cannot be empty.'
                );
            END IF;

            IF v_photo_path LIKE '%..%' OR v_photo_path LIKE '%//%' THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'code', 'INVALID_PHOTO_ATTACHMENTS',
                    'error', 'Invalid evidence file path structure.'
                );
            END IF;

            -- Must strictly match: ^<v_reference>/[0-9]+-[A-Za-z0-9\-_.]+\.(jpg|jpeg|png|webp)$
            IF v_photo_path !~ ('^' || v_reference || '/[0-9]+-[A-Za-z0-9\-_.]+\.(jpg|jpeg|png|webp)$') THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'code', 'INVALID_PHOTO_ATTACHMENTS',
                    'error', 'Evidence attachments must belong to the registered reference and have a valid image format.'
                );
            END IF;
        END LOOP;
    END IF;

    -- G. Insert record with strictly enforced pending status and NULL admin notes
    INSERT INTO public.order_return_requests (
        reference_number,
        order_id,
        order_number,
        customer_email,
        customer_name,
        request_type,
        product_name,
        reason,
        description,
        photo_urls,
        status,
        admin_notes
    ) VALUES (
        v_reference,
        v_order.id,
        v_order.order_number,
        v_clean_email,
        NULLIF(v_clean_name, ''),
        v_clean_type,
        v_clean_product,
        v_clean_reason,
        v_clean_desc,
        COALESCE(p_photo_paths, '{}'),
        'pending',
        NULL
    )
    RETURNING id INTO v_inserted_id;

    -- Mark reservation as used if applicable
    IF v_reservation.id IS NOT NULL THEN
        UPDATE public.return_reference_reservations
        SET used_at = timezone('utc'::text, now())
        WHERE id = v_reservation.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_inserted_id,
        'reference_number', v_reference,
        'order_number', v_order.order_number,
        'status', 'pending',
        'created_at', timezone('utc'::text, now())
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_return_request(text, text, text, text, text, text, text, text[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_return_request(text, text, text, text, text, text, text, text[], text, text) TO anon, authenticated;

-- Overload cleanup helper for legacy signature
CREATE OR REPLACE FUNCTION public.submit_return_request(
    p_order_number text,
    p_customer_email text,
    p_customer_name text DEFAULT NULL,
    p_request_type text DEFAULT 'return_sealed',
    p_product_name text DEFAULT '',
    p_reason text DEFAULT '',
    p_description text DEFAULT '',
    p_photo_paths text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    RETURN public.submit_return_request(
        p_order_number => p_order_number,
        p_customer_email => p_customer_email,
        p_customer_name => p_customer_name,
        p_request_type => p_request_type,
        p_product_name => p_product_name,
        p_reason => p_reason,
        p_description => p_description,
        p_photo_paths => p_photo_paths,
        p_reference_number => NULL,
        p_reservation_token => NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_return_request(text, text, text, text, text, text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_return_request(text, text, text, text, text, text, text, text[]) TO anon, authenticated;

-- 9. Durable Notification Outbox (Task 3: Replace in-memory deduplication)
CREATE TABLE IF NOT EXISTS public.order_return_notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key VARCHAR(128) UNIQUE NOT NULL, -- e.g. "REQUEST_CREATED:RET-XXX" or "STATUS_UPDATED:RET-XXX:approved"
    reference_number VARCHAR(64) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    lease_until TIMESTAMPTZ,
    idempotency_key VARCHAR(128) NOT NULL,
    last_error TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.order_return_notification_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_return_notification_events FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_notify_events_ref ON public.order_return_notification_events(reference_number);
CREATE INDEX IF NOT EXISTS idx_notify_events_status ON public.order_return_notification_events(status);

-- RPC: claim_return_notification_event
-- Atomically claims a notification event with an active processing lease, preventing duplicate dispatch across serverless instances.
CREATE OR REPLACE FUNCTION public.claim_return_notification_event(
    p_event_key text,
    p_reference_number text,
    p_event_type text,
    p_recipient_email text,
    p_payload jsonb DEFAULT '{}'::jsonb,
    p_lease_seconds int DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean_key text;
    v_now timestamptz;
    v_lease_until timestamptz;
    v_idempotency_key text;
    v_event record;
BEGIN
    v_clean_key := trim(p_event_key);
    v_now := timezone('utc'::text, now());
    v_lease_until := v_now + (COALESCE(p_lease_seconds, 90) || ' seconds')::interval;

    -- Advisory lock on event key for concurrency serialization
    PERFORM pg_advisory_xact_lock(hashtext('event:' || v_clean_key));

    SELECT * INTO v_event
    FROM public.order_return_notification_events
    WHERE event_key = v_clean_key
    FOR UPDATE;

    IF v_event.id IS NULL THEN
        v_idempotency_key := 'aurix-notify-' || substr(md5(v_clean_key || ':' || extract(epoch from v_now)::text), 1, 24);

        INSERT INTO public.order_return_notification_events (
            event_key,
            reference_number,
            event_type,
            recipient_email,
            status,
            attempts,
            lease_until,
            idempotency_key,
            payload
        ) VALUES (
            v_clean_key,
            trim(p_reference_number),
            trim(p_event_type),
            lower(trim(p_recipient_email)),
            'processing',
            1,
            v_lease_until,
            v_idempotency_key,
            COALESCE(p_payload, '{}'::jsonb)
        )
        RETURNING * INTO v_event;

        RETURN jsonb_build_object(
            'action', 'claimed',
            'event_id', v_event.id,
            'idempotency_key', v_event.idempotency_key,
            'attempts', v_event.attempts,
            'status', 'processing'
        );
    END IF;

    IF v_event.status = 'sent' THEN
        RETURN jsonb_build_object(
            'action', 'already_sent',
            'event_id', v_event.id,
            'sent_at', v_event.sent_at,
            'status', 'sent'
        );
    END IF;

    IF v_event.status = 'processing' AND v_event.lease_until > v_now THEN
        RETURN jsonb_build_object(
            'action', 'in_flight',
            'event_id', v_event.id,
            'lease_until', v_event.lease_until,
            'status', 'processing'
        );
    END IF;

    IF v_event.attempts >= v_event.max_attempts THEN
        RETURN jsonb_build_object(
            'action', 'exhausted',
            'event_id', v_event.id,
            'attempts', v_event.attempts,
            'last_error', v_event.last_error,
            'status', 'failed'
        );
    END IF;

    -- Re-claim expired lease or retry failed attempt
    UPDATE public.order_return_notification_events
    SET status = 'processing',
        attempts = attempts + 1,
        lease_until = v_lease_until,
        updated_at = v_now
    WHERE id = v_event.id
    RETURNING * INTO v_event;

    RETURN jsonb_build_object(
        'action', 'claimed',
        'event_id', v_event.id,
        'idempotency_key', v_event.idempotency_key,
        'attempts', v_event.attempts,
        'status', 'processing'
    );
END;
$$;

-- RPC: finalize_return_notification_event
CREATE OR REPLACE FUNCTION public.finalize_return_notification_event(
    p_event_key text,
    p_status text,
    p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean_key text;
    v_clean_status text;
    v_now timestamptz;
BEGIN
    v_clean_key := trim(p_event_key);
    v_clean_status := lower(trim(p_status));
    v_now := timezone('utc'::text, now());

    IF v_clean_status NOT IN ('sent', 'failed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid status. Expected sent or failed.');
    END IF;

    UPDATE public.order_return_notification_events
    SET status = v_clean_status,
        sent_at = CASE WHEN v_clean_status = 'sent' THEN v_now ELSE sent_at END,
        last_error = p_error,
        lease_until = NULL,
        updated_at = v_now
    WHERE event_key = v_clean_key;

    RETURN jsonb_build_object('success', true, 'status', v_clean_status);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_return_notification_event(text, text, text, text, jsonb, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_return_notification_event(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_return_notification_event(text, text, text, text, jsonb, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_return_notification_event(text, text, text) TO service_role;

-- 10. Private Storage Bucket Configuration for Return Evidence
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'return-requests',
    'return-requests',
    false,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS Idempotency
DROP POLICY IF EXISTS "Allow authenticated and guest uploads for return evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins and verified customers to read return evidence" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete return evidence" ON storage.objects;

-- Strict upload policy enforcing folder hierarchy, MIME type, and bucket containment
CREATE POLICY "Allow authenticated and guest uploads for return evidence"
    ON storage.objects
    FOR INSERT
    TO public
    WITH CHECK (
        bucket_id = 'return-requests'
        AND name ~ '^RET-[A-Za-z0-9\-_]{6,40}/[0-9]+-[A-Za-z0-9\-_.]+\.(jpg|jpeg|png|webp)$'
        AND (metadata->>'mimetype' IN ('image/jpeg', 'image/png', 'image/webp') OR metadata->>'mimetype' IS NULL)
    );

-- Restrict read access to administrators and the requesting customer
CREATE POLICY "Allow admins and verified customers to read return evidence"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'return-requests'
        AND (
            public.is_admin()
            OR EXISTS (
                SELECT 1 FROM public.order_return_requests r
                WHERE lower(trim(r.customer_email)) = lower(trim(auth.jwt() ->> 'email'))
                  AND name LIKE r.reference_number || '/%'
            )
        )
    );

-- Only admins can delete evidence
CREATE POLICY "Only admins can delete return evidence"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'return-requests'
        AND public.is_admin()
    );
