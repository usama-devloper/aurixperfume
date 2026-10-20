
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

      if (rpcErr || !rpcRes?.order_id) {
        // Safe diagnostic logging: log RPC error code/message without customer/payment secrets
        console.error("Authoritative order RPC failed:", {
          message: rpcErr?.message,
          code: rpcErr?.code,
          details: rpcErr?.details,
          hasOrderId: !!rpcRes?.order_id,
        });

        // Map errors to generic, actionable customer-facing messages
        let userFacingError = "We could not complete your order. Please review your cart and try again.";
        const rawMsg = (rpcErr?.message || "").toLowerCase();
        if (rawMsg.includes("out of stock")) {
          userFacingError = "One or more items in your cart is currently out of stock. Please update your cart and try again.";
        } else if (rawMsg.includes("empty") || rawMsg.includes("invalid quantity")) {
          userFacingError = "Please check your cart items and quantities before placing your order.";
        } else if (rawMsg.includes("not found")) {
          userFacingError = "A product in your cart is no longer available. Please refresh your cart.";
        } else if (rawMsg.includes("authentication required") || rawMsg.includes("jwt")) {
          userFacingError = "Your session has expired. Please sign in again to complete your order.";
        }

        throw new Error(userFacingError);
      }

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
    } catch (error: any) {
      console.error("Order placement error:", error?.message || "Unknown error");
      toast({
        title: "Order Placement Issue",
        description: error?.message || "We could not place your order. Please try again.",
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
