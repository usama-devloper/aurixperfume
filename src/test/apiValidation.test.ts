import { describe, it, expect } from "vitest";
import { CheckoutRequestSchema, AdminCouponCreateSchema } from "../lib/validators";

describe("REST API Validation & Server-Authoritative Checkout Rules", () => {
  it("validates legitimate checkout payload", () => {
    const validPayload = {
      items: [
        { product_id: 1, quantity: 2 },
        { product_id: 2, quantity: 1 },
      ],
      shipping_address: {
        full_name: "John Doe",
        address: "123 Perfume Blvd",
        city: "Mumbai",
        state: "Maharashtra",
        zip: "400001",
        phone: "+919876543210",
        email: "customer@aurixperfume.in",
      },
      coupon_code: "WELCOME10",
      payment_method: "card",
    };

    const result = CheckoutRequestSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects checkout with empty cart", () => {
    const emptyPayload = {
      items: [],
      shipping_address: {
        full_name: "John Doe",
        address: "123 Perfume Blvd",
        city: "Mumbai",
        state: "Maharashtra",
        zip: "400001",
      },
    };

    const result = CheckoutRequestSchema.safeParse(emptyPayload);
    expect(result.success).toBe(false);
  });

  it("rejects checkout with invalid item quantity (> 50 or <= 0)", () => {
    const zeroQuantity = {
      items: [{ product_id: 1, quantity: 0 }],
      shipping_address: {
        full_name: "John Doe",
        address: "123 Perfume Blvd",
        city: "Mumbai",
        state: "Maharashtra",
        zip: "400001",
      },
    };

    const excessiveQuantity = {
      items: [{ product_id: 1, quantity: 999 }],
      shipping_address: {
        full_name: "John Doe",
        address: "123 Perfume Blvd",
        city: "Mumbai",
        state: "Maharashtra",
        zip: "400001",
      },
    };

    expect(CheckoutRequestSchema.safeParse(zeroQuantity).success).toBe(false);
    expect(CheckoutRequestSchema.safeParse(excessiveQuantity).success).toBe(false);
  });

  it("validates and uppercase-transforms admin coupon creation", () => {
    const couponPayload = {
      code: "festive20",
      discount_type: "percent",
      discount_value: 20,
      min_order: 1500,
      is_active: true,
    };

    const result = AdminCouponCreateSchema.safeParse(couponPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("FESTIVE20");
    }
  });

  it("rejects invalid discount types", () => {
    const invalidCoupon = {
      code: "BADCOUPON",
      discount_type: "unknown_type",
      discount_value: 50,
      min_order: 100,
    };

    const result = AdminCouponCreateSchema.safeParse(invalidCoupon);
    expect(result.success).toBe(false);
  });
});
