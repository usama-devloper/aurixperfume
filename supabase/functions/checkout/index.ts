import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAuth } from "../_shared/auth.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";
import { CheckoutRequestSchema } from "../_shared/validators.ts";

Deno.serve(async (req) => {
  const start = performance.now();
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return err("Method Not Allowed", "METHOD_NOT_ALLOWED", 405);
  }

  let user: any = null;
  let body: any = null;

  try {
    const auth = await requireAuth(req);
    user = auth.user;

    const rawBody = await req.json();
    body = rawBody;

    const parseResult = CheckoutRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      await logApiCall({
        endpoint: "/checkout",
        method: req.method,
        user_id: user.id,
        status_code: 400,
        request_body: body,
        response_body: parseResult.error.flatten(),
        duration_ms: performance.now() - start,
      });
      return err("Invalid checkout data", "VALIDATION_ERROR", 400, parseResult.error.flatten());
    }

    const { items, shipping_address, coupon_code, payment_method } = parseResult.data;

    // Call atomic checkout database function as authenticated user
    const authHeader = req.headers.get("Authorization");
    const supabase = getSupabaseClient(authHeader);

    const { data, error } = await supabase.rpc("create_order_atomic", {
      p_items: items,
      p_shipping_address: shipping_address,
      p_coupon_code: coupon_code || null,
      p_payment_method: payment_method,
    });

    if (error) {
      const isStockError = error.message.toLowerCase().includes("stock");
      const statusCode = isStockError ? 409 : 400;

      await logApiCall({
        endpoint: "/checkout",
        method: req.method,
        user_id: user.id,
        status_code: statusCode,
        request_body: body,
        response_body: { message: error.message },
        duration_ms: performance.now() - start,
      });

      return err(
        error.message,
        isStockError ? "INSUFFICIENT_STOCK" : "CHECKOUT_FAILED",
        statusCode
      );
    }

    await logApiCall({
      endpoint: "/checkout",
      method: req.method,
      user_id: user.id,
      status_code: 201,
      request_body: { items_count: items.length, payment_method, coupon_code },
      response_body: { order_number: data.order_number },
      duration_ms: performance.now() - start,
    });

    return ok(data, undefined, 201);
  } catch (error: any) {
    if (error instanceof Response) return error;

    await logApiCall({
      endpoint: "/checkout",
      method: req.method,
      user_id: user?.id,
      status_code: 500,
      request_body: body,
      response_body: { message: error.message },
      duration_ms: performance.now() - start,
    });

    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
