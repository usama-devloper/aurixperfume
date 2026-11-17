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

serve(async (req: any) => {
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

    // Verify order belongs to user and is in a payable state
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, user_id, total_amount, payment_status, discount_amount, shipping, tax, subtotal")
      .eq("id", body.orderId)
      .single();

    if (orderErr || !order || order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.payment_status === "paid") {
      return new Response(JSON.stringify({ error: "Order is already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Zero or negative orders cannot be processed through Stripe Checkout sessions
    const totalOrderAmountINR = Number(order.total_amount);
    if (!totalOrderAmountINR || Math.round(totalOrderAmountINR * 100) <= 0) {
      return new Response(
        JSON.stringify({ error: "Orders with total amount of zero or less cannot be processed through Stripe" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch actual order items from DB to ensure prices and quantities are authentic and cannot be tampered with
    const { data: dbItems, error: dbItemsErr } = await supabase
      .from("order_items")
      .select("id, product_id, quantity, unit_price")
      .eq("order_id", body.orderId);

    if (dbItemsErr || !dbItems || dbItems.length === 0) {
      return new Response(JSON.stringify({ error: "Order items not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch product details for names/images
    const productIds = dbItems.map((it: any) => it.product_id);
    const { data: dbProducts } = await supabase
      .from("products")
      .select("id, name, image")
      .in("id", productIds);

    const productMap = new Map((dbProducts || []).map((p: any) => [p.id, p]));

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil" as any,
    });

    const lineItems = dbItems.map((item: any) => {
      const prod: any = productMap.get(item.product_id);
      return {
        price_data: {
          currency: "inr",
          product_data: {
            name: prod?.name || `Product #${item.product_id}`,
            ...(prod?.image ? { images: [prod.image] } : {}),
          },
          unit_amount: Math.round(Number(item.unit_price) * 100),
        },
        quantity: item.quantity,
      };
    });

    // Authoritative pricing breakdown calculation
    // Derives catalog subtotal strictly from DB items
    const catalogSubtotal = dbItems.reduce(
      (sum: number, it: any) => sum + Number(it.unit_price) * it.quantity,
      0
    );

    const dbDiscount = Number(order.discount_amount) || 0;
    const netSubtotal = Math.max(0, catalogSubtotal - dbDiscount);

    // Authoritative fee resolution:
    // If order has explicitly stored tax/shipping (from create_order_atomic), use them.
    // If order was created by create_authoritative_order where shipping & tax defaulted to 0,
    // derive them server-side from total_amount and netSubtotal according to the authoritative business rules
    // (8% tax on net subtotal, remainder to shipping), completely immune to client-side payload tampering.
    let dbShipping = 0;
    let dbTax = 0;

    const storedShipping = Number(order.shipping) || 0;
    const storedTax = Number(order.tax) || 0;

    if (storedShipping > 0 || storedTax > 0) {
      dbShipping = storedShipping;
      dbTax = storedTax;
    } else {
      const extraFees = Math.round((totalOrderAmountINR - netSubtotal) * 100) / 100;
      if (extraFees > 0) {
        const expectedTax = Math.round(netSubtotal * 0.08 * 100) / 100;
        if (Math.abs(extraFees - expectedTax) <= 0.05) {
          dbTax = extraFees;
          dbShipping = 0;
        } else if (extraFees > expectedTax) {
          dbTax = expectedTax;
          dbShipping = Math.round((extraFees - expectedTax) * 100) / 100;
        } else {
          dbTax = extraFees;
          dbShipping = 0;
        }
      }
    }

    // Attach shipping line item if applicable
    if (dbShipping > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: { name: "Shipping" },
          unit_amount: Math.round(dbShipping * 100),
        },
        quantity: 1,
      });
    }

    // Attach tax line item if applicable
    if (dbTax > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: { name: "Tax (8%)" },
          unit_amount: Math.round(dbTax * 100),
        },
        quantity: 1,
      });
    }

    // Authoritative discount via Stripe Coupon
    let discounts: { coupon: string }[] | undefined = undefined;
    if (dbDiscount > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: Math.round(dbDiscount * 100),
        currency: "inr",
        duration: "once",
        name: "Order Discount",
      });
      discounts = [{ coupon: stripeCoupon.id }];
    }

    const origin = req.headers.get("origin") || "http://localhost:8080";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: lineItems,
      ...(discounts ? { discounts } : {}),
      success_url: `${origin}${body.successPath || "/order-confirmation"}?session_id={CHECKOUT_SESSION_ID}&order_id=${body.orderId}`,
      cancel_url: `${origin}${body.cancelPath || "/checkout"}?canceled=1`,
      metadata: {
        order_id: body.orderId,
        user_id: user.id,
      },
    });

    // Save session id as payment_reference and persist authoritative pricing breakdown
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = serviceRoleKey
      ? createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey, { auth: { persistSession: false } })
      : supabase;

    await adminClient
      .from("orders")
      .update({
        payment_reference: session.id,
        payment_method: "card",
        subtotal: catalogSubtotal,
        shipping: dbShipping,
        tax: dbTax,
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
