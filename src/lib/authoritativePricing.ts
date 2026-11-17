/**
 * Authoritative E-Commerce Pricing, Coupon & Payment Reconciliation Contract
 *
 * Provides a single source of truth for pricing calculations across:
 * 1. Storefront order creation (create_authoritative_order / useOrders)
 * 2. REST API atomic checkout (create_order_atomic / checkout)
 * 3. Stripe Checkout session construction (create-checkout-session)
 * 4. Payment webhook cryptographic verification (payment-webhook)
 */

export interface OrderPricingInput {
  total_amount: number;
  discount_amount?: number | null;
  shipping?: number | null;
  tax?: number | null;
  subtotal?: number | null;
}

export interface OrderItemPricingInput {
  unit_price: number;
  quantity: number;
}

export interface AuthoritativePricingResolution {
  catalogSubtotal: number;
  discountAmount: number;
  netSubtotal: number;
  shipping: number;
  tax: number;
  totalAmount: number;
  stripeLineItemsPaise: number;
  stripeCouponPaise: number;
  stripeFinalAmountPaise: number;
  expectedPaise: number;
  diffPaise: number;
  isExactMatch: boolean;
}

export interface CouponValidationInput {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  is_active: boolean;
  valid_until?: Date | string | null;
}

/**
 * Resolves authoritative pricing breakdown for Stripe Checkout
 *
 * Handles both:
 * - Orders with explicitly stored tax/shipping (from create_order_atomic)
 * - Orders with legacy/defaulted 0 tax/shipping (from create_authoritative_order)
 *
 * Derives exact amounts without trusting any client-supplied payload parameters.
 */
export const resolveAuthoritativePricing = (
  order: OrderPricingInput,
  items: OrderItemPricingInput[]
): AuthoritativePricingResolution => {
  const totalAmount = Number(order.total_amount) || 0;

  // Calculate catalog subtotal strictly from DB items
  const catalogSubtotal = items.reduce(
    (sum, item) => sum + Number(item.unit_price) * item.quantity,
    0
  );

  const discountAmount = Number(order.discount_amount) || 0;
  const netSubtotal = Math.max(0, catalogSubtotal - discountAmount);

  let shipping = 0;
  let tax = 0;

  const storedShipping = Number(order.shipping) || 0;
  const storedTax = Number(order.tax) || 0;

  if (storedShipping > 0 || storedTax > 0) {
    // Explicitly stored in orders (create_order_atomic flow)
    shipping = storedShipping;
    tax = storedTax;
  } else {
    // Legacy / unpopulated orders (create_authoritative_order flow)
    const extraFees = Math.round((totalAmount - netSubtotal) * 100) / 100;
    if (extraFees > 0) {
      const expectedTax = Math.round(netSubtotal * 0.08 * 100) / 100;
      if (Math.abs(extraFees - expectedTax) <= 0.05) {
        tax = extraFees;
        shipping = 0;
      } else if (extraFees > expectedTax) {
        tax = expectedTax;
        shipping = Math.round((extraFees - expectedTax) * 100) / 100;
      } else {
        tax = extraFees;
        shipping = 0;
      }
    }
  }

  // Stripe integer paise calculations
  const productLineItemsPaise = Math.round(catalogSubtotal * 100);
  const shippingLineItemPaise = Math.round(shipping * 100);
  const taxLineItemPaise = Math.round(tax * 100);
  const grossLineItemsPaise = productLineItemsPaise + shippingLineItemPaise + taxLineItemPaise;

  const stripeCouponPaise = discountAmount > 0 ? Math.round(discountAmount * 100) : 0;
  const stripeFinalAmountPaise = grossLineItemsPaise - stripeCouponPaise;

  const expectedPaise = Math.round(totalAmount * 100);
  const diffPaise = Math.abs(stripeFinalAmountPaise - expectedPaise);

  return {
    catalogSubtotal,
    discountAmount,
    netSubtotal,
    shipping,
    tax,
    totalAmount,
    stripeLineItemsPaise: grossLineItemsPaise,
    stripeCouponPaise,
    stripeFinalAmountPaise,
    expectedPaise,
    diffPaise,
    isExactMatch: diffPaise === 0,
  };
};

/**
 * Validates promotional coupon against authoritative business rules
 */
export const validateAuthoritativeCoupon = (
  coupon: CouponValidationInput,
  subtotal: number,
  now = new Date()
): { isValid: boolean; discountAmount: number; error?: string } => {
  const validUntilDate = coupon.valid_until ? new Date(coupon.valid_until) : null;

  if (!coupon.is_active || (validUntilDate && validUntilDate < now)) {
    return {
      isValid: false,
      discountAmount: 0,
      error: `Invalid or expired coupon code "${coupon.code}"`,
    };
  }

  if (subtotal < coupon.min_order) {
    return {
      isValid: false,
      discountAmount: 0,
      error: `Coupon requires minimum order of ₹${coupon.min_order}`,
    };
  }

  let discountAmount = 0;
  if (coupon.discount_type === "percent") {
    discountAmount = Math.round(subtotal * (coupon.discount_value / 100.0) * 100) / 100;
  } else {
    discountAmount = Math.min(coupon.discount_value, subtotal);
  }

  return { isValid: true, discountAmount };
};
