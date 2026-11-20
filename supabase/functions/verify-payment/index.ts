import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const ALLOWED_ORIGINS = new Set([
  "https://aurixperfume.in",
  "https://www.aurixperfume.in",
]);
const DEFAULT_PRODUCTION_ORIGIN = "https://aurixperfume.in";

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : DEFAULT_PRODUCTION_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

serve(async (req: any) => {
  const rawOrigin = req.headers.get("origin");
  const trimmedOrigin = rawOrigin ? rawOrigin.trim() : null;
  const corsHeaders = getCorsHeaders(trimmedOrigin);

  if (trimmedOrigin !== null && !ALLOWED_ORIGINS.has(trimmedOrigin)) {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionId, orderId } = await req.json();
    if (!sessionId || !orderId) {
      return new Response(
        JSON.stringify({ error: "sessionId and orderId required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("verify-payment: STRIPE_SECRET_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Payment verification service is temporarily unavailable" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil" as any,
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify the session belongs to this user and order
    if (session.metadata?.order_id !== orderId || session.metadata?.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Order or user mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strictly validate currency against store currency (INR)
    if (!session.currency || session.currency.toLowerCase() !== "inr") {
      return new Response(JSON.stringify({ error: "Currency mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paid = session.payment_status === "paid";

    // Use service role to read/update regardless of RLS
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch existing order first (including authoritative total_amount) to validate ownership, amount, and paid state
    const { data: existingOrder, error: fetchErr } = await admin
      .from("orders")
      .select("id, user_id, total_amount, payment_status")
      .eq("id", orderId)
      .single();

    if (fetchErr || !existingOrder || existingOrder.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Preserve already-paid orders; never overwrite payment_status = 'paid' with 'failed' or any non-paid status
    if (existingOrder.payment_status === "paid") {
      return new Response(
        JSON.stringify({
          paid: true,
          paymentStatus: "paid",
          already_processed: true,
          amount: session.amount_total,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate Stripe session amount_total against authoritative database total_amount (matching payment-webhook 100-paise tolerance)
    const sessionAmount = session.amount_total;
    const expectedAmount = Math.round(Number(existingOrder.total_amount) * 100);

    if (
      typeof sessionAmount !== "number" ||
      !Number.isFinite(sessionAmount) ||
      sessionAmount <= 0 ||
      !Number.isFinite(expectedAmount) ||
      expectedAmount <= 0
    ) {
      return new Response(JSON.stringify({ error: "Invalid payment amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (Math.abs(sessionAmount - expectedAmount) > 100) {
      console.error("verify-payment: amount mismatch", {
        orderId,
        expectedAmount,
        sessionAmount,
      });
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: updatedRows, error: updateErr } = await admin
      .from("orders")
      .update({
        payment_status: paid ? "paid" : "failed",
        status: paid ? "processing" : "pending",
        payment_reference: sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .neq("payment_status", "paid")
      .select("id");

    if (updateErr) {
      console.error("verify-payment: failed to update order payment status", {
        orderId,
        code: updateErr.code,
      });
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If zero rows were updated, a concurrent webhook already settled this order to 'paid'.
    // Re-read authoritative DB state so a concurrently paid order is never reported as failed.
    if (!updatedRows || updatedRows.length === 0) {
      const { data: latestOrder } = await admin
        .from("orders")
        .select("payment_status")
        .eq("id", orderId)
        .single();

      const isNowPaid = latestOrder?.payment_status === "paid";
      return new Response(
        JSON.stringify({
          paid: isNowPaid,
          paymentStatus: isNowPaid ? "paid" : session.payment_status,
          already_processed: isNowPaid,
          amount: session.amount_total,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        paid,
        paymentStatus: session.payment_status,
        amount: session.amount_total,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("verify-payment error", error);
    return new Response(
      JSON.stringify({
        error: "Verification failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
