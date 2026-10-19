import { apiFetch } from "./client";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: number;
  quantity: number;
  unit_price: number;
  products?: {
    name: string;
    image: string;
    price: number;
    slug?: string;
  };
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  subtotal: number;
  discount_amount?: number;
  shipping: number;
  tax: number;
  total_amount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  payment_method: string;
  payment_status: "unpaid" | "paid" | "cod_pending" | "awaiting_contact" | "failed";
  payment_reference?: string;
  upi_utr?: string;
  shipping_carrier?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  shipping_address?: any;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface CheckoutPayload {
  items: Array<{ product_id: number; quantity: number }>;
  shipping_address: {
    full_name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    email?: string;
  };
  coupon_code?: string;
  payment_method?: "card" | "upi" | "cod" | "manual";
}

export const createCheckoutOrder = (payload: CheckoutPayload) => {
  return apiFetch<{
    order_id: string;
    order_number: string;
    total_amount: number;
    subtotal: number;
    shipping: number;
    tax: number;
  }>("/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getMyOrders = (params?: { page?: number; limit?: number }) => {
  return apiFetch<Order[]>("/orders-my", {
    method: "GET",
    params,
  });
};

export const getOrder = (orderId: string) => {
  return apiFetch<Order>("/orders-get", {
    method: "GET",
    params: { id: orderId },
  });
};

export const initiatePayment = (orderId: string, provider: "stripe" | "razorpay" = "stripe") => {
  return apiFetch<{
    provider: string;
    order_id: string;
    order_number: string;
    amount: number;
    currency: string;
    status: string;
  }>("/payment-initiate", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId, provider }),
  });
};
