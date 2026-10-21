-- AURIX Perfume: Core Database Security, RLS & Production Constraints
-- Apply this migration to ensure all tables, RLS policies, and order tracking security are strictly enforced.

-- 1. Ensure Orders Table has Row Level Security enabled
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

-- Revoke TRUNCATE and all direct write privileges from anon and authenticated
-- Order creation MUST happen strictly through the authoritative server RPC (create_authoritative_order / create_order_atomic)
REVOKE TRUNCATE, INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;

-- 2. Drop existing and legacy policies on public.orders (including actual live DB policy names)
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Order tracking lookup" ON public.orders;
DROP POLICY IF EXISTS "Orders are viewable by owner" ON public.orders;
DROP POLICY IF EXISTS "Orders are insertable by owner" ON public.orders;

-- Policy: Authenticated users can view only their own orders
CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- Policy: Only admins can update order status, carrier, tracking info, and payments
-- (Admin writes are granted via authenticated role with is_admin() policy check)
GRANT UPDATE ON public.orders TO authenticated;

CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Ensure Order Items Table has Row Level Security enabled
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;

-- Revoke TRUNCATE and all direct write privileges from anon and authenticated on order_items
-- Order items are created exclusively by the server-authoritative RPC and are immutable
REVOKE TRUNCATE, INSERT, UPDATE, DELETE ON public.order_items FROM anon, authenticated;

-- Drop existing and legacy policies on public.order_items
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view order items for their orders" ON public.order_items;

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

-- 4. Ensure Products Table has proper RLS & Revoke TRUNCATE
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
REVOKE TRUNCATE ON public.products FROM anon, authenticated;

-- 5. Ensure Shipping Addresses Table has proper RLS & Revoke TRUNCATE
ALTER TABLE IF EXISTS public.shipping_addresses ENABLE ROW LEVEL SECURITY;
REVOKE TRUNCATE ON public.shipping_addresses FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can manage own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can view own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can view their own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can insert own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can create their own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can update own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can update their own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can delete own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can delete their own shipping addresses" ON public.shipping_addresses;

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

