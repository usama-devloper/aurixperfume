import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-08-27.basil" as any,
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req: any) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature || !endpointSecret) {
    return new Response(JSON.stringify({ error: "Missing webhook secret or signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: any;
  try {
    const bodyText = await req.text();
    event = await stripe.webhooks.constructEventAsync(bodyText, signature, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        const userId = session.metadata?.user_id;

        if (!orderId) {
          console.warn("No order_id found in session metadata");
          break;
        }

        // Verify order in database
        const { data: order, error: orderErr } = await adminClient
          .from("orders")
          .select("id, user_id, total_amount, payment_status")
          .eq("id", orderId)
          .single();

        if (orderErr || !order) {
          console.error("Order not found during webhook execution:", orderId);
          break;
        }

        // Idempotency: if already paid, skip re-processing
        if (order.payment_status === "paid") {
          console.log(`Order ${orderId} already marked paid.`);
          break;
        }

        // Validate user_id matches
        if (userId && order.user_id && order.user_id !== userId) {
          console.error(`User mismatch for order ${orderId}`);
          break;
        }

        // Validate currency and amount
        const sessionAmount = session.amount_total; // in paise (e.g. 100 paise = 1 INR)
        const expectedAmount = Math.round(Number(order.total_amount) * 100);

        if (session.currency?.toLowerCase() !== "inr") {
          console.error(`Currency mismatch: expected INR, got ${session.currency}`);
          break;
        }

        if (Math.abs(sessionAmount - expectedAmount) > 100) { // allow max 1 INR rounding diff
          console.error(`Amount mismatch: session=${sessionAmount}, expected=${expectedAmount}`);
          break;
        }

        // Authoritatively update order status to paid
        await adminClient
          .from("orders")
          .update({
            payment_status: "paid",
            status: "processing",
            payment_reference: session.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        console.log(`Successfully verified and marked order ${orderId} as paid via webhook.`);
        break;
      }

      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const sessionOrIntent = event.data.object;
        const orderId = sessionOrIntent.metadata?.order_id;
        if (orderId) {
          await adminClient
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
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error processing webhook:", error.message);
    return new Response(JSON.stringify({ error: "Failed to process webhook" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
