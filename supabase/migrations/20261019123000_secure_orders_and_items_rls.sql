-- AURIX Perfume: Core Database Security, RLS & Production Constraints
-- Apply this migration to ensure all tables, RLS policies, and order tracking security are strictly enforced.

-- 1. Ensure Orders Table has Row Level Security enabled
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy or open policies if any exist
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Order tracking lookup" ON public.orders;

-- Policy: Authenticated users can view only their own orders
CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- Policy: Authenticated users can create orders for themselves
CREATE POLICY "Users can insert own orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Only admins can update order status, carrier, tracking info, and payments
CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Ensure Order Items Table has Row Level Security enabled
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;

-- Policy: Users can view order items for orders they own, or admins can view all
CREATE POLICY "Users can view own order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND (o.user_id = auth.uid() OR public.is_admin())
  )
);

-- Policy: Users can insert order items when creating their order
CREATE POLICY "Users can insert own order items"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND o.user_id = auth.uid()
  )
);

-- 4. Ensure Shipping Addresses Table has proper RLS
ALTER TABLE IF EXISTS public.shipping_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can view own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can insert own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can update own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can delete own shipping addresses" ON public.shipping_addresses;

CREATE POLICY "Users can view own shipping addresses"
ON public.shipping_addresses FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert own shipping addresses"
ON public.shipping_addresses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shipping addresses"
ON public.shipping_addresses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shipping addresses"
ON public.shipping_addresses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
