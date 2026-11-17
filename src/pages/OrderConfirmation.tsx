import { useEffect, useState } from "react";
import { useLocation, Link, useSearchParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Loader2, AlertCircle, Banknote, Smartphone, CreditCard, MessageCircle, Phone, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSetting } from "@/hooks/useSiteSettings";

const OrderConfirmation = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const orderIdParam = searchParams.get("order_id");

  const stateOrderId: string | undefined = location.state?.orderId;
  const statePaymentMethod: string | undefined = location.state?.paymentMethod;
  const statePaymentStatus: string | undefined = location.state?.paymentStatus;
  const stateTotalAmount: number | undefined = location.state?.totalAmount;

  const adminWhatsapp = useSiteSetting("admin_whatsapp_number") || "+919104455400";

  const [verifying, setVerifying] = useState<boolean>(!!sessionId);
  const [paid, setPaid] = useState<boolean | null>(null);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      if (sessionId && orderIdParam) {
        try {
          const { data, error } = await supabase.functions.invoke("verify-payment", {
            body: { sessionId, orderId: orderIdParam },
          });
          if (error) throw error;
          setPaid(!!data?.paid);
        } catch (e) {
          console.error("verify-payment failed", e);
          setPaid(false);
        } finally {
          setVerifying(false);
        }

        // Fetch the order details
        const { data: o } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderIdParam)
          .maybeSingle();
        if (o) setOrder(o);
      }
    };
    run();
  }, [sessionId, orderIdParam]);

  // No way to identify the order — go home
  if (!sessionId && !stateOrderId) {
    return <Navigate to="/" />;
  }

  const orderNumber = order?.order_number || stateOrderId || "—";
  const paymentMethod = order?.payment_method || statePaymentMethod;
  const paymentStatus = paid === true ? "paid" : paid === false ? "failed" : (order?.payment_status || statePaymentStatus || "unpaid");

  const methodIcon = paymentMethod === "upi" ? <Smartphone className="w-4 h-4 text-[#C5A880]" /> :
                     paymentMethod === "cod" ? <Banknote className="w-4 h-4 text-[#C5A880]" /> :
                     paymentMethod === "manual" ? <MessageCircle className="w-4 h-4 text-[#C5A880]" /> :
                     <CreditCard className="w-4 h-4 text-[#C5A880]" />;

  const methodLabel = paymentMethod === "upi" ? "UPI Transfer" :
                      paymentMethod === "cod" ? "Cash on Delivery" :
                      paymentMethod === "manual" ? "Direct Concierge (WhatsApp)" :
                      paymentMethod === "card" ? "Credit / Debit Card (Stripe)" :
                      "—";

  const statusBadge = () => {
    if (verifying) return { icon: <Loader2 className="w-14 h-14 animate-spin text-[#C5A880]" />, title: "Verifying Transaction…", desc: "Connecting to secure payment gateway to verify settlement." };
    if (paymentStatus === "paid") return { icon: <CheckCircle2 className="w-14 h-14 text-green-600 dark:text-green-400" />, title: "Payment Successfully Confirmed", desc: "Your order is secured and has entered our compounding and inspection schedule." };
    if (paymentStatus === "cod_pending") return { icon: <Banknote className="w-14 h-14 text-[#C5A880]" />, title: "Cash on Delivery Order Placed", desc: "Your order has been registered. Our courier concierge will collect payment upon delivery." };
    if (paymentStatus === "awaiting_contact") return { icon: <MessageCircle className="w-14 h-14 text-[#C5A880]" />, title: "Order Reserved — Contact Concierge", desc: "Please message our administrator on WhatsApp to complete payment and release your parcel." };
    if (paymentStatus === "unpaid" && paymentMethod === "upi") return { icon: <Clock className="w-14 h-14 text-[#C5A880]" />, title: "Order Received — Verifying UTR", desc: "Your order is reserved. We will verify your UPI transaction reference within a few hours." };
    if (paymentStatus === "failed") return { icon: <AlertCircle className="w-14 h-14 text-destructive" />, title: "Payment Incomplete", desc: "The transaction could not be finalized. Your items remain safe in your cart." };
    return { icon: <CheckCircle2 className="w-14 h-14 text-green-600 dark:text-green-400" />, title: "Thank You for Your Order", desc: "Your bespoke fragrance order has been successfully placed." };
  };

  const s = statusBadge();

  return (
    <div className="container mx-auto px-4 lg:px-8 py-16 max-w-3xl">
      <div className="text-center">
        <div className="mb-6 flex justify-center">{s.icon}</div>
        <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-1 block">
          Order Confirmation
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-medium text-foreground tracking-tight mb-3">{s.title}</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">{s.desc}</p>

        <div className="bg-card shadow-sm rounded-xl p-6 sm:p-8 mb-8 border border-border text-left">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-border/80 pb-3">
              <h2 className="font-serif text-lg font-semibold text-foreground">Order Specifications</h2>
              <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-muted rounded border border-border/60">
                {orderNumber}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <div>
                <p className="text-muted-foreground uppercase tracking-wider font-semibold">Order Reference</p>
                <p className="font-semibold text-foreground mt-0.5">{orderNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wider font-semibold">Order Date</p>
                <p className="font-semibold text-foreground mt-0.5">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wider font-semibold">Payment Gateway</p>
                <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5">{methodIcon}{methodLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wider font-semibold">Payment Status</p>
                <p className="font-semibold text-foreground mt-0.5 capitalize">{paymentStatus.replace("_", " ")}</p>
              </div>
              {order?.total_amount && (
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider font-semibold">Total Amount</p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">₹{Number(order.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              )}
              {order?.upi_utr && (
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider font-semibold">Recorded UPI UTR</p>
                  <p className="font-mono font-semibold text-foreground mt-0.5">{order.upi_utr}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border/80 space-y-2">
              <h3 className="font-serif text-sm font-semibold text-foreground">Next Steps</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>You will receive an automated dispatch notification when your package leaves the atelier.</li>
                <li>You can track courier milestones anytime using your Order Reference on the tracking portal.</li>
                {paymentMethod === "upi" && paymentStatus === "unpaid" && (
                  <li>Our client care team will match your UTR and mark your order verified shortly.</li>
                )}
                {paymentMethod === "cod" && (
                  <li>Please keep exact cash ready upon delivery for our courier associate.</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {paymentMethod === "manual" && paymentStatus === "awaiting_contact" && (
          <div className="bg-card border border-[#C5A880]/60 rounded-xl p-6 sm:p-8 mb-8 text-center space-y-4">
            <h3 className="font-serif text-lg font-semibold text-foreground flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#C5A880]" />
              Complete Your Settlement via WhatsApp
            </h3>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Message our administrator directly on WhatsApp. We will share the authorized account details for order <strong>{orderNumber}</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href={`https://wa.me/${adminWhatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                  `Hi, I just placed order ${orderNumber} for ₹${(order?.total_amount ?? stateTotalAmount ?? 0).toFixed
                    ? Number(order?.total_amount ?? stateTotalAmount ?? 0).toFixed(2)
                    : order?.total_amount ?? stateTotalAmount ?? ""}. Please share payment details.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button className="btn-gold text-xs uppercase tracking-wider font-semibold h-11 px-6">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message Founder on WhatsApp
                </Button>
              </a>
              <a href={`tel:${adminWhatsapp}`} className="inline-flex">
                <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold h-11 px-6">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Concierge
                </Button>
              </a>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/order-tracking">
            <Button className="w-full sm:w-auto btn-gold h-11 px-6 text-xs uppercase tracking-wider font-semibold">
              Track My Order
            </Button>
          </Link>
          <Link to="/products">
            <Button variant="outline" className="w-full sm:w-auto rounded-md border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold h-11 px-6">
              Continue Browsing
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
