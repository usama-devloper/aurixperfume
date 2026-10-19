-- ==============================================================================
-- AURIX PERFUME — Production REST API & Database Hardening Migration
-- Tables: profiles, products, orders, order_items, api_logs, coupons
-- Functions: create_authoritative_order_v2 (atomic checkout with stock & coupons)
-- RLS: Strict Customer/Admin isolation and audit logging
-- ==============================================================================

-- 1. PROFILES TABLE & ROLE ENUM
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('customer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role public.app_role DEFAULT 'customer'::public.app_role NOT NULL,
  phone text,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Ensure additive columns exist if profiles was pre-created with only first_name/last_name
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_role DEFAULT 'customer'::public.app_role NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Synchronize existing users and roles into profiles (preserving existing full_name if present)
INSERT INTO public.profiles (id, full_name, role)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin') THEN 'admin'::public.app_role
    ELSE 'customer'::public.app_role
  END
FROM auth.users u
ON CONFLICT (id) DO UPDATE 
SET 
  role = EXCLUDED.role,
  full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

-- 2. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text CHECK (discount_type IN ('percent', 'fixed')) NOT NULL,
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_order numeric DEFAULT 0 CHECK (min_order >= 0),
  valid_until timestamptz,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Insert seed coupons if not present
INSERT INTO public.coupons (code, discount_type, discount_value, min_order, valid_until, is_active)
VALUES 
  ('WELCOME10', 'percent', 10, 500, now() + interval '1 year', true),
  ('AURIXLUX500', 'fixed', 500, 3000, now() + interval '1 year', true)
ON CONFLICT (code) DO NOTHING;

-- 3. API_LOGS TABLE (Audit & Debugging)
CREATE TABLE IF NOT EXISTS public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  method text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status_code int NOT NULL,
  request_body jsonb,
  response_body jsonb,
  duration_ms numeric,
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Index for log analytics & rate limiting queries
CREATE INDEX IF NOT EXISTS idx_api_logs_user_created ON public.api_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON public.api_logs(endpoint, created_at DESC);

-- 4. HARDEN PRODUCTS & ORDERS SCHEMA (Add slug, compare_price, is_active if missing)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock integer DEFAULT 50 NOT NULL;

-- Backfill slugs
UPDATE public.products 
SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || id
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- Add coupon columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping numeric DEFAULT 0;

-- 5. ROW LEVEL SECURITY POLICIES

-- PROFILES RLS
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin full control on profiles" ON public.profiles;
CREATE POLICY "Admin full control on profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_admin());

-- PRODUCTS RLS
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
ON public.products FOR SELECT
TO anon, authenticated
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin full control on products" ON public.products;
CREATE POLICY "Admin full control on products"
ON public.products FOR ALL
TO authenticated
USING (public.is_admin());

-- COUPONS RLS (No public direct access; only through Edge Functions / Admin)
DROP POLICY IF EXISTS "Admin full control on coupons" ON public.coupons;
CREATE POLICY "Admin full control on coupons"
ON public.coupons FOR ALL
TO authenticated
USING (public.is_admin());

-- API_LOGS RLS (Admin full view; service role inserts)
DROP POLICY IF EXISTS "Admin can view api logs" ON public.api_logs;
CREATE POLICY "Admin can view api logs"
ON public.api_logs FOR SELECT
TO authenticated
USING (public.is_admin());

-- 6. ATOMIC CHECKOUT POSTGRES FUNCTION (WITH COUPONS & STOCK DEDUCTION)
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_items jsonb, -- Array of { product_id: int, quantity: int }
  p_shipping_address jsonb, -- { full_name, address, city, state, zip, phone, email }
  p_coupon_code text DEFAULT NULL,
  p_payment_method text DEFAULT 'card'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_order_id uuid;
  v_order_number text;
  v_item record;
  v_product record;
  v_coupon record;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_shipping numeric := 0;
  v_tax numeric := 0;
  v_tax_rate numeric := 0.08;
  v_shipping_fee numeric := 400;
  v_free_shipping_threshold numeric := 2000;
  v_total_amount numeric := 0;
  v_payment_status text := 'unpaid';
  v_coupon_id uuid := NULL;
BEGIN
  -- 1. User Authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for checkout';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- 2. Validate Items
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart cannot be empty';
  END IF;

  -- 3. Calculate Subtotal & Verify Stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id int, quantity int)
  LOOP
    IF v_item.quantity <= 0 OR v_item.quantity > 50 THEN
      RAISE EXCEPTION 'Invalid quantity % for product ID %', v_item.quantity, v_item.product_id;
    END IF;

    SELECT id, name, price, stock, is_active INTO v_product
    FROM public.products
    WHERE id = v_item.product_id
    FOR UPDATE; -- Row-level lock to prevent race conditions on stock

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID % not found', v_item.product_id;
    END IF;

    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product "%" is no longer available', v_product.name;
    END IF;

    IF v_product.stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Only % units available', v_product.name, v_product.stock;
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_item.quantity);
  END LOOP;

  -- 4. Validate Coupon if provided
  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE code = upper(trim(p_coupon_code))
      AND is_active = true
      AND (valid_until IS NULL OR valid_until > now());

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or expired coupon code "%"', p_coupon_code;
    END IF;

    IF v_subtotal < v_coupon.min_order THEN
      RAISE EXCEPTION 'Coupon requires minimum order of ₹%', v_coupon.min_order;
    END IF;

    IF v_coupon.discount_type = 'percent' THEN
      v_discount := round((v_subtotal * (v_coupon.discount_value / 100.0)), 2);
    ELSE
      v_discount := LEAST(v_coupon.discount_value, v_subtotal);
    END IF;

    v_coupon_id := v_coupon.id;
  END IF;

  -- 5. Calculate Shipping & Tax
  IF (v_subtotal - v_discount) < v_free_shipping_threshold THEN
    v_shipping := v_shipping_fee;
  ELSE
    v_shipping := 0;
  END IF;

  v_tax := round(((v_subtotal - v_discount) * v_tax_rate), 2);
  v_total_amount := (v_subtotal - v_discount) + v_shipping + v_tax;

  -- 6. Initial Payment Status
  IF p_payment_method = 'cod' THEN
    v_payment_status := 'cod_pending';
  ELSIF p_payment_method = 'manual' THEN
    v_payment_status := 'awaiting_contact';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  v_order_number := 'ORD-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(random()::text), 1, 6);

  -- 7. Insert Order
  INSERT INTO public.orders (
    user_id,
    order_number,
    subtotal,
    discount_amount,
    shipping,
    tax,
    total_amount,
    status,
    payment_method,
    payment_status,
    coupon_id,
    shipping_address
  ) VALUES (
    v_user_id,
    v_order_number,
    v_subtotal,
    v_discount,
    v_shipping,
    v_tax,
    v_total_amount,
    'pending',
    p_payment_method,
    v_payment_status,
    v_coupon_id,
    p_shipping_address
  ) RETURNING id INTO v_order_id;

  -- 8. Insert Order Items & Decrement Stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id int, quantity int)
  LOOP
    SELECT name, price INTO v_product FROM public.products WHERE id = v_item.product_id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price
    ) VALUES (
      v_order_id,
      v_item.product_id,
      v_item.quantity,
      v_product.price
    );

    -- Decrement stock
    UPDATE public.products
    SET stock = stock - v_item.quantity,
        in_stock = (stock - v_item.quantity > 0)
    WHERE id = v_item.product_id;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping', v_shipping,
    'tax', v_tax,
    'total_amount', v_total_amount,
    'payment_status', v_payment_status,
    'status', 'pending'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_atomic(jsonb, jsonb, text, text) TO authenticated;
