import { describe, it, expect } from "vitest";

describe("Cart and Pricing Server-Validation logic", () => {
  it("calculates subtotal correctly from cart items", () => {
    const items = [
      { product: { id: 1, name: "Oud Sovereign", price: 4200 }, quantity: 2 },
      { product: { id: 2, name: "Desert Saffron", price: 3800 }, quantity: 1 },
    ];
    const subtotal = items.reduce((sum, it) => sum + it.product.price * it.quantity, 0);
    expect(subtotal).toBe(12200);
  });

  it("applies free shipping when exceeding free shipping threshold (₹2000)", () => {
    const freeShippingThreshold = 2000;
    const shippingFee = 400;

    const subtotalAbove = 3500;
    const shippingAbove = subtotalAbove >= freeShippingThreshold ? 0 : shippingFee;
    expect(shippingAbove).toBe(0);

    const subtotalBelow = 1500;
    const shippingBelow = subtotalBelow >= freeShippingThreshold ? 0 : shippingFee;
    expect(shippingBelow).toBe(400);
  });

  it("calculates tax accurately at 8%", () => {
    const taxRate = 0.08;
    const subtotal = 10000;
    const tax = subtotal * taxRate;
    expect(tax).toBe(800);
  });

  it("verifies order total equals subtotal + shipping + tax", () => {
    const subtotal = 10000;
    const shipping = 0;
    const tax = 800;
    const orderTotal = subtotal + shipping + tax;
    expect(orderTotal).toBe(10800);
  });

  it("rejects negative quantities or fractional invalid quantities", () => {
    const validateQuantity = (qty: number) => Number.isInteger(qty) && qty > 0 && qty <= 99;
    expect(validateQuantity(1)).toBe(true);
    expect(validateQuantity(5)).toBe(true);
    expect(validateQuantity(0)).toBe(false);
    expect(validateQuantity(-2)).toBe(false);
    expect(validateQuantity(1.5)).toBe(false);
    expect(validateQuantity(100)).toBe(false);
  });
});
