import { apiFetch } from "./client";

export interface CouponValidation {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  estimated_discount: number;
  valid_until?: string | null;
}

export const validateCoupon = (code: string, subtotal?: number) => {
  return apiFetch<CouponValidation>("/coupons-validate", {
    method: "GET",
    params: { code, subtotal },
  });
};
