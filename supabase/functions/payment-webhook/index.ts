import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const start = performance.now();
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return err("Method Not Allowed", "METHOD_NOT_ALLOWED", 405);
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature") || req.headers.get("x-razorpay-signature");

    let event: any = null;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return err("Invalid JSON payload", "BAD_PAYLOAD", 400);
    }

    const supabase = getServiceSupabaseClient();

    // Check Stripe checkout.session.completed or Razorpay payment.captured
    const eventType = event.type || event.event;
    let orderId: string | null = null;
    let paymentRef: string | null = null;

    if (eventType === "checkout.session.completed") {
      orderId = event.data?.object?.metadata?.order_id || event.data?.object?.client_reference_id;
      paymentRef = event.data?.object?.payment_intent || event.data?.object?.id;
    } else if (eventType === "payment.captured") {
      orderId = event.payload?.payment?.entity?.notes?.order_id;
      paymentRef = event.payload?.payment?.entity?.id;
    }

    if (orderId) {
      // Idempotent update: mark order as paid
      const { data: updatedOrder, error } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "processing",
          payment_reference: paymentRef || "webhook_verified",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) {
        console.error("Webhook update error:", error);
      }
    }

    await logApiCall({
      endpoint: "/payment-webhook",
      method: req.method,
      status_code: 200,
      request_body: { eventType, orderId, signaturePresent: !!signature },
      duration_ms: performance.now() - start,
    });

    return ok({ received: true });
  } catch (error: any) {
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
