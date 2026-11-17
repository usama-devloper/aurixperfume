import { useSiteSettings } from "./useSiteSettings";

const DEFAULTS = {
  shippingFee: 400,
  freeShippingThreshold: 1000,
  taxRate: 0.08,
};

export interface PricingBreakdown {
  shipping: number;
  tax: number;
  orderTotal: number;
  shippingFee: number;
  freeShippingThreshold: number;
  taxRate: number;
}

/**
 * Reads checkout pricing config (shipping fee, free shipping threshold, tax rate)
 * from site_settings and computes the breakdown for a given subtotal.
 *
 * Defaults are used as fallbacks if settings are missing or still loading.
 */
export const usePricingSettings = (subtotal: number): PricingBreakdown => {
  const { data: settings } = useSiteSettings();

  const getNumber = (key: string, fallback: number) => {
    const raw = settings?.find((s) => s.key === key)?.value;
    if (raw === undefined || raw === null || raw === "") return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const shippingFee = getNumber("shipping_fee", DEFAULTS.shippingFee);
  const freeShippingThreshold = getNumber(
    "free_shipping_threshold",
    DEFAULTS.freeShippingThreshold
  );
  const taxRate = getNumber("tax_rate", DEFAULTS.taxRate);

  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingFee;
  const tax = subtotal * taxRate;
  const orderTotal = subtotal + shipping + tax;

  return {
    shipping,
    tax,
    orderTotal,
    shippingFee,
    freeShippingThreshold,
    taxRate,
  };
};
