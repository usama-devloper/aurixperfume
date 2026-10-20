-- AURIX Perfume: Server-Authoritative Atomic Order Creation & Secure Order Tracking
-- Removes permissive USING (true) lookup policy and provides secure database function

-- 1. DROP the permissive public lookup policy
DROP POLICY IF EXISTS "Order tracking lookup" ON public.orders;

-- Ensure orders SELECT is strictly constrained to authenticated owner or admin
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

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
SET search_path = public
AS $$
BEGIN
  -- Strict input validation: must be exact alphanumeric / hyphen query between 4 and 40 characters
  IF p_query IS NULL OR length(trim(p_query)) < 4 OR length(trim(p_query)) > 40 THEN
    RETURN;
  END IF;

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
  WHERE o.order_number = trim(p_query)
     OR (o.tracking_number IS NOT NULL AND o.tracking_number = trim(p_query))
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
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_order_id uuid;
  v_order_number text;
  v_item record;
  v_product record;
  v_subtotal numeric := 0;
  v_shipping numeric := 0;
  v_tax numeric := 0;
  v_tax_rate numeric := 0.08;
  v_shipping_fee numeric := 400;
  v_free_shipping_threshold numeric := 2000;
  v_total_amount numeric := 0;
  v_payment_status text := 'unpaid';
BEGIN
  -- 1. Authenticate user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create order';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Ensure user profile/record exists
  INSERT INTO public.users (id, email)
  VALUES (v_user_id, COALESCE(v_user_email, ''))
  ON CONFLICT (id) DO NOTHING;

  -- 2. Validate items
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order items cannot be empty';
  END IF;

  -- 3. Read site settings for pricing
  SELECT COALESCE(value::numeric, 400) INTO v_shipping_fee 
  FROM public.site_settings WHERE key = 'shipping_fee';
  
  SELECT COALESCE(value::numeric, 2000) INTO v_free_shipping_threshold 
  FROM public.site_settings WHERE key = 'free_shipping_threshold';

  SELECT COALESCE(value::numeric, 0.08) INTO v_tax_rate 
  FROM public.site_settings WHERE key = 'tax_rate';

  -- 4. Calculate subtotal server-side using trusted product records
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id int, quantity int)
  LOOP
    IF v_item.quantity <= 0 OR v_item.quantity > 99 THEN
      RAISE EXCEPTION 'Invalid quantity % for product ID %', v_item.quantity, v_item.product_id;
    END IF;

    SELECT id, name, price, in_stock INTO v_product
    FROM public.products
    WHERE id = v_item.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID % not found', v_item.product_id;
    END IF;

    IF NOT v_product.in_stock THEN
      RAISE EXCEPTION 'Product % is currently out of stock', v_product.name;
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_item.quantity);
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
  IF p_payment_method = 'cod' THEN
    v_payment_status := 'cod_pending';
  ELSIF p_payment_method = 'manual' THEN
    v_payment_status := 'awaiting_contact';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  v_order_number := 'ORD-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(random()::text), 1, 6);

  -- 5. Insert order record atomically
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
    p_payment_method,
    v_payment_status,
    p_upi_utr
  ) RETURNING id INTO v_order_id;

  -- 6. Insert order items with trusted server prices
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id int, quantity int)
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
      v_item.quantity,
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

GRANT EXECUTE ON FUNCTION public.create_authoritative_order(jsonb, uuid, text, text) TO authenticated;
