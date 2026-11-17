-- Migration: Unify Authoritative Orders Pricing & Coupon Integration
-- Updates public.create_authoritative_order to persist subtotal, discount_amount, shipping, and tax
-- into public.orders, and adds optional coupon code support while maintaining full backward compatibility.
-- Note: Prepared locally only. Strictly read-only audit mode (do not execute against live DB).

CREATE OR REPLACE FUNCTION public.create_authoritative_order(
  p_items jsonb, -- Array of { product_id: int, quantity: int }
  p_shipping_address_id uuid,
  p_payment_method text DEFAULT 'card',
  p_upi_utr text DEFAULT NULL,
  p_coupon_code text DEFAULT NULL
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
  v_coupon record;
  v_coupon_id uuid := NULL;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_shipping numeric := 0;
  v_tax numeric := 0;
  v_tax_rate numeric := 0.08;
  v_shipping_fee numeric := 400;
  v_free_shipping_threshold numeric := 1000;
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
  FOR v_raw_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_raw_item) <> 'object' THEN
      RAISE EXCEPTION 'Each item in order items must be an object';
    END IF;

    IF NOT (v_raw_item ? 'product_id') OR v_raw_item->'product_id' IS NULL OR jsonb_typeof(v_raw_item->'product_id') <> 'number' THEN
      RAISE EXCEPTION 'Invalid or missing product_id in order items';
    END IF;

    IF (v_raw_item->>'product_id') !~ '^[1-9][0-9]{0,8}$' THEN
      RAISE EXCEPTION 'Product ID must be a positive integer';
    END IF;

    IF NOT (v_raw_item ? 'quantity') OR v_raw_item->'quantity' IS NULL OR jsonb_typeof(v_raw_item->'quantity') <> 'number' THEN
      RAISE EXCEPTION 'Invalid or missing quantity in order items';
    END IF;

    IF (v_raw_item->>'quantity') !~ '^[1-9][0-9]?$' THEN
      RAISE EXCEPTION 'Item quantity must be an integer between 1 and 99';
    END IF;
  END LOOP;

  -- 7. Calculate subtotal server-side using trusted product records & aggregate duplicate product IDs
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

  -- 8. Validate Coupon if provided
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

  -- 9. Calculate Shipping & Tax on net discounted subtotal
  IF (v_subtotal - v_discount) < v_free_shipping_threshold THEN
    v_shipping := v_shipping_fee;
  ELSE
    v_shipping := 0;
  END IF;

  v_tax := round(((v_subtotal - v_discount) * v_tax_rate), 2);
  v_total_amount := (v_subtotal - v_discount) + v_shipping + v_tax;

  -- 10. Initial Payment Status
  IF v_payment_method = 'cod' THEN
    v_payment_status := 'cod_pending';
  ELSIF v_payment_method = 'manual' THEN
    v_payment_status := 'awaiting_contact';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  v_order_number := 'ORD-' || to_char(now(), 'YYMMDD') || '-' || encode(gen_random_bytes(8), 'hex');

  -- 11. Insert order record atomically with authoritative pricing columns
  INSERT INTO public.orders (
    user_id,
    order_number,
    subtotal,
    discount_amount,
    shipping,
    tax,
    total_amount,
    shipping_address_id,
    status,
    payment_method,
    payment_status,
    coupon_id,
    upi_utr
  ) VALUES (
    v_user_id,
    v_order_number,
    v_subtotal,
    v_discount,
    v_shipping,
    v_tax,
    v_total_amount,
    p_shipping_address_id,
    'pending',
    v_payment_method,
    v_payment_status,
    v_coupon_id,
    p_upi_utr
  ) RETURNING id INTO v_order_id;

  -- 12. Insert order items with trusted server prices
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
    'discount_amount', v_discount,
    'shipping', v_shipping,
    'tax', v_tax,
    'payment_status', v_payment_status
  );
END;
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.create_authoritative_order(jsonb, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_authoritative_order(jsonb, uuid, text, text, text) TO authenticated;

-- Ensure free_shipping_threshold is updated to 1000 in site_settings
INSERT INTO public.site_settings (key, value, description)
VALUES ('free_shipping_threshold', '1000', 'Minimum order subtotal in ₹ to qualify for free shipping')
ON CONFLICT (key) DO UPDATE SET value = '1000';

