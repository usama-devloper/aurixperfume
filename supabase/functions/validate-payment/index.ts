import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
];

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const isAllowed = allowedOrigins.includes(origin) || origin.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};

// Validation schemas
interface PaymentValidationRequest {
  paymentMethod: 'card' | 'upi' | 'amazon-pay' | 'paypal' | 'apple-pay';
  orderId: string;
  amount: number;
  // For card payments - these should be Stripe tokens, not actual card data
  stripePaymentMethodId?: string;
  // For UPI
  upiId?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body: PaymentValidationRequest = await req.json();

    console.log('Payment validation request:', {
      userId: user.id,
      paymentMethod: body.paymentMethod,
      orderId: body.orderId,
      amount: body.amount,
    });

    // Validate required fields
    if (!body.paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Payment method is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.orderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.orderId)) {
      return new Response(
        JSON.stringify({ error: 'Valid order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.amount || body.amount <= 0 || body.amount > 1000000) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the order belongs to the user
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, user_id, total_amount, status')
      .eq('id', body.orderId)
      .single();

    if (orderError || !order) {
      console.error('Order verification error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.user_id !== user.id) {
      console.error('Order ownership mismatch');
      return new Response(
        JSON.stringify({ error: 'Unauthorized to process this order' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount matches order
    if (Math.abs(parseFloat(order.total_amount) - body.amount) > 0.01) {
      return new Response(
        JSON.stringify({ error: 'Payment amount does not match order total' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payment method specific requirements
    if (body.paymentMethod === 'card') {
      // For card payments, require Stripe payment method ID (not actual card details)
      if (!body.stripePaymentMethodId || !body.stripePaymentMethodId.startsWith('pm_')) {
        return new Response(
          JSON.stringify({ error: 'Valid Stripe payment method ID required for card payments' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Here you would integrate with Stripe to process the payment
      // Never accept raw card details
    } else if (body.paymentMethod === 'upi') {
      // Validate UPI ID format
      if (!body.upiId || !/^[\w.-]+@[\w.-]+$/.test(body.upiId)) {
        return new Response(
          JSON.stringify({ error: 'Valid UPI ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Sanitize UPI ID
      if (body.upiId.length > 100) {
        return new Response(
          JSON.stringify({ error: 'UPI ID too long' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Log security event
    await supabaseClient.rpc('log_security_event', {
      p_event_type: 'payment_processing',
      p_user_id: user.id,
      p_email: user.email,
      p_metadata: {
        payment_method: body.paymentMethod,
        order_id: body.orderId,
        amount: body.amount,
        validated: true,
      },
      p_severity: 'medium',
    });

    // Return validation success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment validation successful',
        orderId: body.orderId,
        // In production, this would return payment processor response
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment validation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Payment validation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
