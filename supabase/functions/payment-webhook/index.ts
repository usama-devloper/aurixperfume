import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" as any })
  : null;

Deno.serve(async (req) => {
  const start = performance.now();
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return err("Method Not Allowed", "METHOD_NOT_ALLOWED", 405);
  }

  // Reject unverified Razorpay requests since Razorpay is not active in checkout
  if (req.headers.has("x-razorpay-signature")) {
    await logApiCall({
      endpoint: "/payment-webhook",
      method: req.method,
      status_code: 400,
      request_body: { error: "Razorpay webhook received but Razorpay gateway is inactive" },
      duration_ms: performance.now() - start,
    });
    return err("Razorpay payment processing is not currently active", "GATEWAY_DISABLED", 400);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    await logApiCall({
      endpoint: "/payment-webhook",
      method: req.method,
      status_code: 401,
      request_body: { error: "Missing stripe-signature header" },
      duration_ms: performance.now() - start,
    });
    return err("Missing signature header", "UNAUTHORIZED", 401);
  }

  if (!stripe || !stripeWebhookSecret) {
    await logApiCall({
      endpoint: "/payment-webhook",
      method: req.method,
      status_code: 500,
      request_body: { error: "Stripe webhook credentials not configured in server environment" },
      duration_ms: performance.now() - start,
    });
    return err("Stripe webhook credentials not configured", "SERVER_CONFIG_ERROR", 500);
  }

  let event: Stripe.Event;
  const rawBody = await req.text();

  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, stripeWebhookSecret);
  } catch (sigErr: any) {
    await logApiCall({
      endpoint: "/payment-webhook",
      method: req.method,
      status_code: 400,
      request_body: { error: "Signature verification failed", details: sigErr.message },
      duration_ms: performance.now() - start,
    });
    return err(`Webhook signature verification failed: ${sigErr.message}`, "INVALID_SIGNATURE", 400);
  }

  const supabase = getServiceSupabaseClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const orderId = session.metadata?.order_id || session.client_reference_id;
        const userId = session.metadata?.user_id;

        if (!orderId) {
          return err("Missing order_id in checkout session metadata", "INVALID_METADATA", 400);
        }

        // 1. Verify payment settlement: do not mark unpaid/unsettled sessions as paid
        if (session.payment_status !== "paid") {
          await logApiCall({
            endpoint: "/payment-webhook",
            method: req.method,
            status_code: 200,
            request_body: {
              eventType: event.type,
              orderId,
              payment_status: session.payment_status,
              ignored: true,
              reason: "Payment not settled yet",
            },
            duration_ms: performance.now() - start,
          });
          // Acknowledge receipt with 200 so Stripe does not endlessly retry an unsettled session
          return ok({
            received: true,
            ignored: true,
            reason: `Session payment_status is '${session.payment_status}', not 'paid'`,
          });
        }

        // Verify order exists in database
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .select("id, user_id, total_amount, payment_status")
          .eq("id", orderId)
          .single();

        if (orderErr || !order) {
          return err(`Order ${orderId} not found`, "ORDER_NOT_FOUND", 404);
        }

        // Idempotency check: if order is already marked paid, return success without duplicate processing
        if (order.payment_status === "paid") {
          return ok({ received: true, already_processed: true });
        }

        // Validate user ownership if user_id is in metadata
        if (userId && order.user_id && order.user_id !== userId) {
          return err("Order user association mismatch", "FORBIDDEN", 403);
        }

        // Validate currency and amount
        const sessionAmount = session.amount_total; // in paise
        const expectedAmount = Math.round(Number(order.total_amount) * 100);

        if (session.currency?.toLowerCase() !== "inr") {
          return err(`Currency mismatch: expected inr, got ${session.currency}`, "CURRENCY_MISMATCH", 400);
        }

        if (Math.abs(sessionAmount - expectedAmount) > 100) { // allow max 1 INR tolerance
          return err(`Amount mismatch: expected ${expectedAmount}, got ${sessionAmount}`, "AMOUNT_MISMATCH", 400);
        }

        // Authoritatively update order status to paid with database-level conditional guard
        // Note: .neq("payment_status", "paid") provides row-level atomic deduplication against
        // concurrent webhook deliveries, but does not constitute complete event-level idempotency
        // or guarantee race-free processing across all distributed edge instances.
        const { data: updatedRows, error: updateErr } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            status: "processing",
            payment_reference: session.payment_intent || session.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .neq("payment_status", "paid")
          .select("id");

        if (updateErr) {
          return err(`Failed to update order status: ${updateErr.message}`, "DB_ERROR", 500);
        }

        // If zero rows were updated, a concurrent delivery has already transitioned this order to paid
        if (!updatedRows || updatedRows.length === 0) {
          return ok({ received: true, already_processed: true });
        }
        break;
      }

      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const sessionOrIntent = event.data.object as any;
        const orderId = sessionOrIntent.metadata?.order_id || sessionOrIntent.client_reference_id;
        if (orderId) {
          await supabase
            .from("orders")
            .update({
              payment_status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId)
            .neq("payment_status", "paid");
        }
        break;
      }

      default:
        // Ignore other unhandled event types safely
        break;
    }

    await logApiCall({
      endpoint: "/payment-webhook",
      method: req.method,
      status_code: 200,
      request_body: { eventType: event.type },
      duration_ms: performance.now() - start,
    });

    return ok({ received: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
