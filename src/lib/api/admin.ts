import { apiFetch } from "./client";
import { Product } from "./products";
import { Order } from "./orders";

export interface DashboardStats {
  total_products: number;
  total_orders: number;
  pending_orders: number;
  verified_revenue: number;
  low_stock_count: number;
  low_stock_items: Array<{ id: number; name: string; stock: number }>;
  recent_orders: Array<{
    id: string;
    order_number: string;
    total_amount: number;
    status: string;
    payment_status: string;
    created_at: string;
  }>;
  total_api_calls: number;
}

export interface CouponItem {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  valid_until?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiLogItem {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  duration_ms: number;
  request_body?: any;
  response_body?: any;
  ip_address?: string;
  created_at: string;
}

export const getAdminStats = () => {
  return apiFetch<DashboardStats>("/admin-dashboard-stats", { method: "GET" });
};

export const getAdminOrders = (params?: {
  status?: string;
  payment_status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return apiFetch<Order[]>("/admin-orders-list", {
    method: "GET",
    params: params as any,
  });
};

export const updateOrderStatus = (data: {
  order_id: string;
  status: Order["status"];
  tracking_number?: string | null;
  shipping_carrier?: string | null;
  estimated_delivery?: string | null;
}) => {
  return apiFetch<Order>("/admin-orders-update-status", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const createAdminProduct = (product: Partial<Product>) => {
  return apiFetch<Product>("/admin-products-create", {
    method: "POST",
    body: JSON.stringify(product),
  });
};

export const updateAdminProduct = (product: Partial<Product> & { id: number }) => {
  return apiFetch<Product>("/admin-products-update", {
    method: "POST",
    body: JSON.stringify(product),
  });
};

export const deleteAdminProduct = (id: number) => {
  return apiFetch<{ message: string }>("/admin-products-delete", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
};

export const getAdminCoupons = () => {
  return apiFetch<CouponItem[]>("/admin-coupons-manage", { method: "GET" });
};

export const createAdminCoupon = (coupon: Omit<CouponItem, "id" | "created_at">) => {
  return apiFetch<CouponItem>("/admin-coupons-manage", {
    method: "POST",
    body: JSON.stringify(coupon),
  });
};

export const getAdminApiLogs = (params?: { page?: number; limit?: number }) => {
  return apiFetch<ApiLogItem[]>("/admin-api-logs", {
    method: "GET",
    params,
  });
};

export const promoteUserRole = (userId: string, role: "customer" | "admin") => {
  return apiFetch<{ message: string; role: string }>("/admin-users-promote", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, role }),
  });
};
