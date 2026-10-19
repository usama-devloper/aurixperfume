
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { ShippingAddress } from "./useShippingAddresses";
import { CartItem } from "@/types";

export interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: "pending" | "processing" | "shipped" | "delivered";
  created_at: string;
  updated_at: string;
  tracking_number: string | null;
  shipping_carrier: string | null;
  estimated_delivery: string | null;
  payment_status?: string;
  payment_method?: string | null;
  payment_reference?: string | null;
  upi_utr?: string | null;
  shipping_address?: ShippingAddress;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: number;
  quantity: number;
  unit_price: number;
  product?: {
    name: string;
    image: string;
  };
}

export const useOrders = () => {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setOrders([]);
      setLoading(false);
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Different queries for admin vs regular users
      let query = supabase
        .from("orders")
        .select(`
          *,
          shipping_address:shipping_address_id (*)
        `)
        .order("created_at", { ascending: false });

      // If not admin, only fetch user's own orders (RLS will handle this automatically)
      if (!isAdmin && user) {
        query = query.eq("user_id", user.id);
      }

      const { data: ordersData, error } = await query;
      
      if (error) throw error;
      
      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);
            
          if (itemsError) throw itemsError;
          
          // Cast the status to our Order type's status
          const status = order.status as "pending" | "processing" | "shipped" | "delivered";
          
          return {
            ...order,
            status,
            items: itemsData
          };
        })
      );
      
      setOrders(ordersWithItems as Order[]);
    } catch (error: any) {
      console.error("Error fetching orders:", error.message);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const placeOrder = async (
    cartItems: CartItem[],
    totalAmount: number,
    shippingAddressId: string,
    paymentOptions?: {
      payment_method?: "card" | "upi" | "cod" | "manual";
      payment_status?: "unpaid" | "paid" | "failed" | "cod_pending" | "awaiting_contact";
      upi_utr?: string | null;
      payment_reference?: string | null;
    }
  ) => {
    try {
      if (!user) throw new Error("User not authenticated");

      // 1. Try server-authoritative order creation RPC (atomic transaction with DB-verified prices & stock)
      const rpcPayload = {
        p_items: cartItems.map(it => ({ product_id: it.product.id, quantity: it.quantity })),
        p_shipping_address_id: shippingAddressId,
        p_payment_method: paymentOptions?.payment_method ?? "card",
        p_upi_utr: paymentOptions?.upi_utr ?? null
      };

      const { data: rpcRes, error: rpcErr } = await supabase
        .rpc("create_authoritative_order", rpcPayload);

      if (!rpcErr && rpcRes && rpcRes.order_id) {
        fetchOrders();
        return {
          id: rpcRes.order_id,
          order_number: rpcRes.order_number,
          total_amount: rpcRes.total_amount,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          payment_status: rpcRes.payment_status,
          payment_method: paymentOptions?.payment_method ?? null,
          tracking_number: null,
          shipping_carrier: null,
          estimated_delivery: null,
        } as unknown as Order;
      }

      // 2. Client-side fallback if migration not yet applied
      // Ensure user exists in public.users to prevent foreign key constraint violations
      await supabase
        .from("users")
        .upsert({ id: user.id, email: user.email || "" }, { onConflict: "id" });

      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([{
          user_id: user.id,
          order_number: orderNumber,
          total_amount: totalAmount,
          shipping_address_id: shippingAddressId,
          status: "pending",
          payment_method: paymentOptions?.payment_method ?? null,
          payment_status: paymentOptions?.payment_status ?? "unpaid",
          upi_utr: paymentOptions?.upi_utr ?? null,
          payment_reference: paymentOptions?.payment_reference ?? null,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cartItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      fetchOrders();
      return orderData;
    } catch (error: any) {
      console.error("Error placing order:", error.message);
      toast({
        title: "Error",
        description: "Failed to place order",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);
        
      if (error) throw error;
      
      setOrders(prev => 
        prev.map(order => order.id === orderId ? { ...order, status } : order)
      );
      
      toast({
        title: "Order Updated",
        description: `Order status changed to ${status}`
      });
    } catch (error: any) {
      console.error("Error updating order status:", error.message);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const updateTrackingInfo = async (
    orderId: string, 
    trackingNumber: string, 
    shippingCarrier: string,
    estimatedDelivery: string | null = null
  ) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          tracking_number: trackingNumber,
          shipping_carrier: shippingCarrier,
          status: "shipped",
          estimated_delivery: estimatedDelivery,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);
        
      if (error) throw error;
      
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                tracking_number: trackingNumber,
                shipping_carrier: shippingCarrier,
                status: "shipped",
                estimated_delivery: estimatedDelivery 
              } 
            : order
        )
      );
      
      toast({
        title: "Tracking Updated",
        description: "Tracking information has been updated"
      });
    } catch (error: any) {
      console.error("Error updating tracking info:", error.message);
      toast({
        title: "Error",
        description: "Failed to update tracking information",
        variant: "destructive",
      });
    }
  };

  const bulkUpdateOrders = async (
    orderIds: string[],
    updates: {
      status?: Order["status"];
      tracking_number?: string;
      shipping_carrier?: string;
      estimated_delivery?: string | null;
    }
  ) => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
        ...updates,
      };

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .in("id", orderIds);

      if (error) throw error;

      setOrders(prev =>
        prev.map(order =>
          orderIds.includes(order.id)
            ? { ...order, ...updates }
            : order
        )
      );

      toast({
        title: "Orders Updated",
        description: `Successfully updated ${orderIds.length} order(s)`,
      });

      return true;
    } catch (error: any) {
      console.error("Error bulk updating orders:", error.message);
      toast({
        title: "Error",
        description: "Failed to update orders",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    orders,
    loading,
    placeOrder,
    updateOrderStatus,
    updateTrackingInfo,
    bulkUpdateOrders,
    fetchOrders
  };
};
