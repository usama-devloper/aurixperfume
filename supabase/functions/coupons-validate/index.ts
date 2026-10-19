import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const start = performance.now();
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const subtotal = parseFloat(url.searchParams.get("subtotal") || "0");

    if (!code || !code.trim()) {
      return err("Coupon code is required", "VALIDATION_ERROR", 400);
    }

    const supabase = getServiceSupabaseClient();
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      await logApiCall({
        endpoint: "/coupons-validate",
        method: req.method,
        status_code: 500,
        response_body: error,
        duration_ms: performance.now() - start,
      });
      return err("Failed to validate coupon", "DB_ERROR", 500, error.message);
    }

    if (!coupon) {
      return err("Invalid or inactive coupon code", "INVALID_COUPON", 404);
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return err("This coupon has expired", "EXPIRED_COUPON", 400);
    }

    if (subtotal > 0 && subtotal < coupon.min_order) {
      return err(
        `Coupon requires a minimum order value of ₹${coupon.min_order}`,
        "MIN_ORDER_NOT_MET",
        400,
        { min_order: coupon.min_order, current_subtotal: subtotal }
      );
    }

    let discount = 0;
    if (subtotal > 0) {
      if (coupon.discount_type === "percent") {
        discount = Math.round((subtotal * (coupon.discount_value / 100)) * 100) / 100;
      } else {
        discount = Math.min(coupon.discount_value, subtotal);
      }
    }

    const result = {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order: coupon.min_order,
      estimated_discount: discount,
      valid_until: coupon.valid_until,
    };

    await logApiCall({
      endpoint: "/coupons-validate",
      method: req.method,
      status_code: 200,
      duration_ms: performance.now() - start,
    });

    return ok(result);
  } catch (error: any) {
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
