-- AURIX Perfume: Server-Authoritative Atomic Order Creation & Secure Order Tracking
-- Removes permissive USING (true) lookup policy and provides secure database function

-- 1. DROP the permissive public lookup policy and duplicate SELECT policies
DROP POLICY IF EXISTS "Order tracking lookup" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Orders are viewable by owner" ON public.orders;

-- Ensure orders SELECT is strictly constrained to authenticated owner or admin
CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- Ensure cryptographic extensions are enabled for gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create a secure, narrowly-scoped function for Order Tracking
-- Returns ONLY tracking details (no user_id, no payment_reference, no internal data)
CREATE OR REPLACE FUNCTION public.track_order(p_query text)
RETURNS TABLE (
  order_number text,
  tracking_number text,
  shipping_carrier text,
  status text,
  estimated_delivery timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_clean text;
BEGIN
  IF p_query IS NULL THEN
    RETURN;
  END IF;

  v_clean := trim(p_query);

  -- Input hygiene: reject empty queries or strings with dangerous/invalid characters
  IF length(v_clean) = 0 OR length(v_clean) > 40 OR v_clean !~ '^[A-Za-z0-9\-]+$' THEN
    RETURN;
  END IF;

  -- Security Logic:
  -- 1. High-Entropy Order Numbers (ORD-YYMMDD-16hex):
  --    Strict regex: '^ORD-[0-9]{6}-[0-9a-fA-F]{16}$'
  --    Safe for anonymous callers because 16 hex chars (64 bits of entropy) cannot be guessed or enumerated.
  -- 2. Legacy Order Numbers (ORD-YYMMDD-6hex):
  --    Strict regex: '^ORD-[0-9]{6}-[0-9a-fA-F]{6}$'
  --    Contains only ~16.7M combinations per date. Anonymous lookups are REJECTED to prevent enumeration.
  --    Requires authenticated order owner (auth.uid() = o.user_id) or an administrator (public.is_admin()).
  -- 3. Carrier Tracking Numbers:
  --    May follow sequential/predictable formats from logistics partners.
  --    Requires authenticated order owner (auth.uid() = o.user_id) or an administrator (public.is_admin()).
  RETURN QUERY
  SELECT 
    o.order_number,
    o.tracking_number,
    o.shipping_carrier,
    o.status,
    o.estimated_delivery::timestamptz,
    o.created_at,
    o.updated_at
  FROM public.orders o
  WHERE 
    -- Case 1: Unguessable 16-hex format (open to any caller holding the exact token)
    (o.order_number = v_clean AND v_clean ~* '^ORD-[0-9]{6}-[0-9a-f]{16}$')
    OR
    -- Case 2: Legacy 6-hex format (strictly owner or admin only)
    (o.order_number = v_clean AND v_clean ~* '^ORD-[0-9]{6}-[0-9a-f]{6}$' AND (auth.uid() = o.user_id OR public.is_admin()))
    OR
    -- Case 3: Carrier tracking number lookup (strictly owner or admin only)
    (o.tracking_number IS NOT NULL AND o.tracking_number = v_clean AND (auth.uid() = o.user_id OR public.is_admin()))
  LIMIT 1;
END;
$$;

-- Revoke default public execution and grant strictly to anon and authenticated roles
REVOKE ALL ON FUNCTION public.track_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order(text) TO anon, authenticated;

-- 3. Create server-authoritative atomic order placement function
-- Calculates prices, verifies stock, applies server settings, and creates order + items atomically
CREATE OR REPLACE FUNCTION public.create_authoritative_order(
  p_items jsonb, -- Array of { product_id: int, quantity: int }
  p_shipping_address_id uuid,
  p_payment_method text DEFAULT 'card',
  p_upi_utr text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_item record;
  v_raw_item jsonb;
  v_product record;
  v_subtotal numeric := 0;
  v_shipping numeric := 0;
  v_tax numeric := 0;
  v_tax_rate numeric := 0.08;
  v_shipping_fee numeric := 400;
  v_free_shipping_threshold numeric := 2000;
  v_total_amount numeric := 0;
  v_payment_status text := 'unpaid';
  v_payment_method text;
  v_raw_fee text;
  v_raw_thresh text;
  v_raw_tax text;
BEGIN
  -- 1. Authenticate user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create order';
  END IF;

  -- 2. Verify Shipping Address Ownership
  -- Orders require a valid shipping address owned by the authenticated user
  IF p_shipping_address_id IS NULL THEN
    RAISE EXCEPTION 'Shipping address is required to place an order';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.shipping_addresses
    WHERE id = p_shipping_address_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Invalid or unauthorized shipping address';
  END IF;

  -- 3. Validate and Normalize Payment Method
  v_payment_method := lower(trim(COALESCE(p_payment_method, '')));
  IF v_payment_method NOT IN ('card', 'cod', 'manual', 'upi') THEN
    RAISE EXCEPTION 'Unsupported or invalid payment method';
  END IF;

  -- 4. Validate Items Payload (Array of objects, 1 to 50 items)
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Order items must be a non-empty array with at most 50 items';
  END IF;

  -- 5. Read site settings with safe defaults and sensible bounds
  -- Bounds: shipping_fee in [0, 10000], free_shipping_threshold in [0, 100000], tax_rate in [0.00, 1.00]
  SELECT value INTO v_raw_fee FROM public.site_settings WHERE key = 'shipping_fee';
  IF v_raw_fee IS NOT NULL AND length(v_raw_fee) <= 8 AND v_raw_fee ~ '^[0-9]+(\.[0-9]{1,2})?$' THEN
    IF v_raw_fee::numeric >= 0 AND v_raw_fee::numeric <= 10000 THEN
      v_shipping_fee := v_raw_fee::numeric;
    END IF;
  END IF;

  SELECT value INTO v_raw_thresh FROM public.site_settings WHERE key = 'free_shipping_threshold';
  IF v_raw_thresh IS NOT NULL AND length(v_raw_thresh) <= 8 AND v_raw_thresh ~ '^[0-9]+(\.[0-9]{1,2})?$' THEN
    IF v_raw_thresh::numeric >= 0 AND v_raw_thresh::numeric <= 100000 THEN
      v_free_shipping_threshold := v_raw_thresh::numeric;
    END IF;
  END IF;

  SELECT value INTO v_raw_tax FROM public.site_settings WHERE key = 'tax_rate';
  IF v_raw_tax IS NOT NULL AND length(v_raw_tax) <= 6 AND v_raw_tax ~ '^[0-9]+(\.[0-9]{1,4})?$' THEN
    IF v_raw_tax::numeric >= 0 AND v_raw_tax::numeric <= 1.0000 THEN
      v_tax_rate := v_raw_tax::numeric;
    END IF;
  END IF;

  -- 6. Validate each input item individually BEFORE aggregation
  -- Ensures product_id and quantity are strictly positive integers, preventing nulls, non-integers,
  -- zero, negative cancellations (e.g. quantity -2 cancelling +5), and extreme quantities.
  FOR v_raw_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_raw_item) <> 'object' THEN
      RAISE EXCEPTION 'Each item in order items must be an object';
    END IF;

    -- Validate product_id field: must be present, non-null, and integer > 0
    IF NOT (v_raw_item ? 'product_id') OR v_raw_item->'product_id' IS NULL OR jsonb_typeof(v_raw_item->'product_id') <> 'number' THEN
      RAISE EXCEPTION 'Invalid or missing product_id in order items';
    END IF;

    IF (v_raw_item->>'product_id') !~ '^[1-9][0-9]{0,8}$' THEN
      RAISE EXCEPTION 'Product ID must be a positive integer';
    END IF;

    -- Validate quantity field: must be present, non-null, and integer in [1, 99]
    IF NOT (v_raw_item ? 'quantity') OR v_raw_item->'quantity' IS NULL OR jsonb_typeof(v_raw_item->'quantity') <> 'number' THEN
      RAISE EXCEPTION 'Invalid or missing quantity in order items';
    END IF;

    IF (v_raw_item->>'quantity') !~ '^[1-9][0-9]?$' THEN
      RAISE EXCEPTION 'Item quantity must be an integer between 1 and 99';
    END IF;
  END LOOP;

  -- 7. Calculate subtotal server-side using trusted product records & aggregate duplicate product IDs
  -- bigint is used in SUM() to prevent integer overflow during summation, then bounded to [1, 99]
  FOR v_item IN 
    SELECT 
      (elem->>'product_id')::int AS product_id, 
      SUM((elem->>'quantity')::bigint) AS total_quantity
    FROM jsonb_array_elements(p_items) AS elem
    GROUP BY (elem->>'product_id')::int
  LOOP
    IF v_item.product_id IS NULL OR v_item.product_id <= 0 THEN
      RAISE EXCEPTION 'Invalid product ID in order items';
    END IF;

    IF v_item.total_quantity IS NULL OR v_item.total_quantity <= 0 OR v_item.total_quantity > 99 THEN
      RAISE EXCEPTION 'Aggregate quantity % for product ID % exceeds allowable limit (1-99)', v_item.total_quantity, v_item.product_id;
    END IF;

    -- Row lock for read consistency during checkout
    SELECT id, name, price, in_stock INTO v_product
    FROM public.products
    WHERE id = v_item.product_id
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID % not found', v_item.product_id;
    END IF;

    IF NOT v_product.in_stock THEN
      RAISE EXCEPTION 'Product % is currently out of stock', v_product.name;
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_item.total_quantity::int);
  END LOOP;

  -- Calculate shipping & tax
  IF v_subtotal < v_free_shipping_threshold THEN
    v_shipping := v_shipping_fee;
  ELSE
    v_shipping := 0;
  END IF;

  v_tax := round((v_subtotal * v_tax_rate), 2);
  v_total_amount := v_subtotal + v_shipping + v_tax;

  -- Determine initial payment status based on method
  IF v_payment_method = 'cod' THEN
    v_payment_status := 'cod_pending';
  ELSIF v_payment_method = 'manual' THEN
    v_payment_status := 'awaiting_contact';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  -- High-entropy cryptographically secure order identifier (16 hex chars = 1.84 x 10^19 combinations)
  v_order_number := 'ORD-' || to_char(now(), 'YYMMDD') || '-' || encode(gen_random_bytes(8), 'hex');

  -- 7. Insert order record atomically
  INSERT INTO public.orders (
    user_id,
    order_number,
    total_amount,
    shipping_address_id,
    status,
    payment_method,
    payment_status,
    upi_utr
  ) VALUES (
    v_user_id,
    v_order_number,
    v_total_amount,
    p_shipping_address_id,
    'pending',
    v_payment_method,
    v_payment_status,
    p_upi_utr
  ) RETURNING id INTO v_order_id;

  -- 8. Insert order items with trusted server prices
  FOR v_item IN 
    SELECT 
      (elem->>'product_id')::int AS product_id, 
      SUM((elem->>'quantity')::bigint) AS total_quantity
    FROM jsonb_array_elements(p_items) AS elem
    GROUP BY (elem->>'product_id')::int
  LOOP
    SELECT price INTO v_product FROM public.products WHERE id = v_item.product_id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price
    ) VALUES (
      v_order_id,
      v_item.product_id,
      v_item.total_quantity::int,
      v_product.price
    );
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_total_amount,
    'subtotal', v_subtotal,
    'shipping', v_shipping,
    'tax', v_tax,
    'payment_status', v_payment_status
  );
END;
$$;

-- Revoke default public execution and grant strictly to authenticated role
REVOKE ALL ON FUNCTION public.create_authoritative_order(jsonb, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_authoritative_order(jsonb, uuid, text, text) TO authenticated;


