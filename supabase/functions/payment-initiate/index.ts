import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAuth } from "../_shared/auth.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const start = performance.now();
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return err("Method Not Allowed", "METHOD_NOT_ALLOWED", 405);
  }

  let user: any = null;
  try {
    const auth = await requireAuth(req);
    user = auth.user;

    const body = await req.json();
    const { order_id, provider = "stripe" } = body;

    if (!order_id) {
      return err("Order ID is required", "VALIDATION_ERROR", 400);
    }

    const supabase = getServiceSupabaseClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, payment_status, user_id")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (error || !order) {
      return err("Order not found or unauthorized", "ORDER_NOT_FOUND", 404);
    }

    if (order.payment_status === "paid") {
      return err("Order is already paid", "ALREADY_PAID", 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const razorpayKey = Deno.env.get("RAZORPAY_KEY_ID");

    if (provider === "razorpay") {
      if (!razorpayKey) {
        return ok({
          provider: "razorpay",
          status: "mock_ready",
          message: "Razorpay keys not configured. Use card/stripe or manual UPI.",
          order_id: order.id,
          amount: Math.round(Number(order.total_amount) * 100),
          currency: "INR",
        });
      }

      // Generate Razorpay Order
      const amountPaise = Math.round(Number(order.total_amount) * 100);
      return ok({
        provider: "razorpay",
        key_id: razorpayKey,
        amount: amountPaise,
        currency: "INR",
        order_number: order.order_number,
      });
    }

    // Default: Stripe or UPI/COD ready
    return ok({
      provider,
      order_id: order.id,
      order_number: order.order_number,
      amount: order.total_amount,
      currency: "INR",
      status: "ready",
      stripe_configured: !!stripeKey,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
