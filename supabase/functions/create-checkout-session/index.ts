import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LineItemInput {
  name: string;
  image?: string;
  unit_price: number; // in INR
  quantity: number;
}

interface RequestBody {
  orderId: string;
  items: LineItemInput[];
  shipping: number;
  tax: number;
  successPath?: string;
  cancelPath?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body: RequestBody = await req.json();

    if (
      !body.orderId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.orderId
      )
    ) {
      return new Response(JSON.stringify({ error: "Invalid order ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return new Response(JSON.stringify({ error: "Items required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify order belongs to user
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, user_id, total_amount")
      .eq("id", body.orderId)
      .single();

    if (orderErr || !order || order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil" as any,
    });

    const lineItems = body.items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: item.name,
          ...(item.image ? { images: [item.image] } : {}),
        },
        unit_amount: Math.round(item.unit_price * 100),
      },
      quantity: item.quantity,
    }));

    // Add shipping as a line item if > 0
    if (body.shipping > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: { name: "Shipping" },
          unit_amount: Math.round(body.shipping * 100),
        },
        quantity: 1,
      });
    }

    // Add tax as a line item
    if (body.tax > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: { name: "Tax (8%)" },
          unit_amount: Math.round(body.tax * 100),
        },
        quantity: 1,
      });
    }

    const origin = req.headers.get("origin") || "http://localhost:8080";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: lineItems,
      success_url: `${origin}${body.successPath || "/order-confirmation"}?session_id={CHECKOUT_SESSION_ID}&order_id=${body.orderId}`,
      cancel_url: `${origin}${body.cancelPath || "/checkout"}?canceled=1`,
      metadata: {
        order_id: body.orderId,
        user_id: user.id,
      },
    });

    // Save session id as payment_reference
    await supabase
      .from("orders")
      .update({
        payment_reference: session.id,
        payment_method: "card",
      })
      .eq("id", body.orderId);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("create-checkout-session error", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create checkout session",
        message: error instanceof Error ? error.message : "Unknown",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
