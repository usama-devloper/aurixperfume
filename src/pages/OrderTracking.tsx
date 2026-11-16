import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, Truck, CheckCircle2, Clock, MapPin, Calendar, Hash, Sparkles, ExternalLink } from "lucide-react";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered";

interface TrackingResult {
  orderId: string;
  orderNumber: string;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  status: OrderStatus;
  estimatedDelivery: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: "pending", label: "Order Placed", icon: Clock },
  { status: "processing", label: "Preparation", icon: Package },
  { status: "shipped", label: "In Transit", icon: Truck },
  { status: "delivered", label: "Delivered", icon: CheckCircle2 },
];

const CARRIER_LABELS: Record<string, string> = {
  fedex: "FedEx Express",
  ups: "UPS",
  usps: "USPS",
  dhl: "DHL Express",
  bluedart: "Blue Dart",
  dtdc: "DTDC Express",
  delhivery: "Delhivery",
  other: "Courier Service",
};

/**
 * Resolves verified official HTTPS carrier tracking landing pages using an explicit allowlist.
 * Never appends unverified query parameters, and rejects untrusted carriers or missing tracking codes.
 */
const getCarrierTrackingUrl = (carrier: string | null, trackingNumber: string | null): string | null => {
  if (!carrier || !trackingNumber) return null;
  const cleanCode = trackingNumber.trim();
  // Ensure a valid tracking code exists before providing portal link
  if (!cleanCode || cleanCode.length < 4 || cleanCode.length > 40 || !/^[A-Za-z0-9\-_]+$/.test(cleanCode)) {
    return null;
  }

  // Hardcoded explicit HTTPS allowlist of verified official tracking landing pages
  const CARRIER_URLS: Record<string, string> = {
    fedex: "https://www.fedex.com/en-in/tracking.html",
    ups: "https://www.ups.com/in/en/home",
    usps: "https://tools.usps.com/go/TrackAction",
    dhl: "https://www.dhl.com/in-en/home/tracking.html",
    delhivery: "https://www.delhivery.com/tracking",
  };

  const key = carrier.toLowerCase().trim();
  return CARRIER_URLS[key] || null;
};

const OrderTracking = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    const query = searchQuery.trim();
    if (!query) {
      setError("Please enter a tracking number or order ID");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setTrackingResult(null);
    
    try {
      let rpcData: any = null;
      let rpcError: any = null;

      if (typeof supabase.rpc === "function") {
        const res = await supabase.rpc("track_order", { p_query: query });
        rpcData = res.data;
        rpcError = res.error;
      }

      const record = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null;

      if (!rpcError && record) {
        setTrackingResult({
          orderId: record.order_number,
          orderNumber: record.order_number,
          trackingNumber: record.tracking_number,
          shippingCarrier: record.shipping_carrier,
          status: record.status as OrderStatus,
          estimatedDelivery: record.estimated_delivery,
          createdAt: record.created_at,
          updatedAt: record.updated_at,
        });
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("id, order_number, tracking_number, shipping_carrier, status, estimated_delivery, created_at, updated_at")
        .or(`order_number.eq.${query},tracking_number.eq.${query}`)
        .limit(1)
        .maybeSingle();
      
      if (fetchError && !rpcError) throw fetchError;
      
      if (data) {
        setTrackingResult({
          orderId: data.id,
          orderNumber: data.order_number,
          trackingNumber: data.tracking_number,
          shippingCarrier: data.shipping_carrier,
          status: data.status as OrderStatus,
          estimatedDelivery: data.estimated_delivery,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } else {
        setError("Order not found. Please check your tracking number or order ID and try again.");
      }
    } catch (err: any) {
      console.error("Error fetching order:", err.message);
      setError("Unable to fetch order details. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIndex = (status: OrderStatus) => {
    return STATUS_STEPS.findIndex(step => step.status === status);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Pending dispatch";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const carrierTrackingUrl = trackingResult 
    ? getCarrierTrackingUrl(trackingResult.shippingCarrier, trackingResult.trackingNumber)
    : null;

  return (
    <div className="container mx-auto px-4 lg:px-8 py-12 max-w-4xl">
      <div className="text-center mb-10 max-w-xl mx-auto">
        <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
          Concierge Services
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-medium text-foreground tracking-tight mb-2">
          Track Your Delivery
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Enter your order reference or carrier tracking code to monitor real-time fulfillment and parcel transit.
        </p>
      </div>

      {/* Search Card */}
      <Card className="mb-10 border border-border bg-card rounded-xl shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              <Label htmlFor="searchQuery" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Order ID or Tracking Number
              </Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  id="searchQuery"
                  placeholder="e.g. ORD-20261026-0001 or FedEx tracking code"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-md bg-background border-border text-foreground h-12 text-sm focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  aria-label={isLoading ? "Tracking order..." : "Track order"}
                  className="sm:w-36 btn-gold h-12 rounded-md uppercase tracking-wider text-xs font-semibold shadow-sm flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span className="sr-only">Tracking order...</span>
                    </>
                  ) : (
                    "Track"
                  )}
                </Button>
              </div>
              {error && (
                <p role="alert" aria-live="polite" className="text-xs text-destructive mt-2">
                  {error}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Card */}
      {trackingResult && (
        <Card className="border border-border bg-card rounded-xl shadow-md overflow-hidden animate-fade-in motion-reduce:animate-none">
          <CardHeader className="bg-muted/30 border-b border-border/80 py-5 px-6 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#C5A880] font-semibold block">Confirmed Dispatch</span>
                <CardTitle className="text-lg font-serif text-foreground">Order Status Summary</CardTitle>
              </div>
              <span className="text-xs font-mono font-semibold bg-background border border-border/80 px-3 py-1 rounded-md text-foreground self-start sm:self-auto break-all max-w-full">
                {trackingResult.orderNumber}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-8">
            {/* Status Timeline */}
            <div>
              <div 
                role="list" 
                aria-label="Order fulfillment progress"
                className="flex justify-between items-start relative max-w-2xl mx-auto"
              >
                {/* Progress Line */}
                <div className="absolute top-5 left-6 right-6 h-[2px] bg-border z-0" aria-hidden="true">
                  <div 
                    className="h-full bg-[#C5A880] transition-all duration-1000 ease-in-out motion-reduce:transition-none" 
                    style={{ width: `${(getStatusIndex(trackingResult.status) / (STATUS_STEPS.length - 1)) * 100}%` }}
                  />
                </div>
                
                {STATUS_STEPS.map((step, index) => {
                  const currentIndex = getStatusIndex(trackingResult.status);
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;
                  const Icon = step.icon;
                  const stepNumber = index + 1;
                  
                  return (
                    <div 
                      key={step.status} 
                      role="listitem"
                      aria-current={isCurrent ? "step" : undefined}
                      className="flex flex-col items-center z-10 flex-1 px-1"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border motion-reduce:transition-none ${
                        isCompleted 
                          ? "bg-[#C5A880] text-[#1C1917] border-[#C5A880] shadow-sm font-bold" 
                          : "bg-card text-muted-foreground border-border"
                      } ${isCurrent ? "ring-4 ring-[#C5A880]/20" : ""}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <span className={`text-[10px] mt-2.5 uppercase tracking-wider text-center ${
                        isCompleted ? "text-foreground font-semibold" : "text-muted-foreground"
                      }`}>
                        <span className="sr-only">Step {stepNumber}: </span>
                        {step.label}
                        {isCurrent && <span className="sr-only"> (Current status)</span>}
                        {isCompleted && !isCurrent && <span className="sr-only"> (Completed)</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3.5 p-4 rounded-lg border border-border bg-muted/20">
                <div className="bg-card p-2 rounded-full border border-border text-[#C5A880] shrink-0 mt-0.5">
                  <Hash className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Order Reference</p>
                  <p className="font-mono text-xs font-semibold text-foreground mt-0.5 break-all">{trackingResult.orderNumber}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3.5 p-4 rounded-lg border border-border bg-muted/20">
                <div className="bg-card p-2 rounded-full border border-border text-[#C5A880] shrink-0 mt-0.5">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Order Date</p>
                  <p className="text-xs text-foreground mt-0.5">{formatDate(trackingResult.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-lg border border-border bg-muted/20">
                <div className="bg-card p-2 rounded-full border border-border text-[#C5A880] shrink-0 mt-0.5">
                  <Truck className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Courier Carrier</p>
                  <p className="text-xs text-foreground mt-0.5 font-medium">
                    {trackingResult.shippingCarrier ? CARRIER_LABELS[trackingResult.shippingCarrier] || trackingResult.shippingCarrier : "Dedicated courier packaging"}
                  </p>
                  {trackingResult.trackingNumber && (
                    <div className="mt-1">
                      <span className="text-[10px] text-muted-foreground">Tracking Code: </span>
                      <span className="font-mono text-xs font-semibold text-foreground break-all">{trackingResult.trackingNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-lg border border-border bg-muted/20">
                <div className="bg-card p-2 rounded-full border border-border text-[#C5A880] shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Estimated Arrival</p>
                  <p className="text-xs text-foreground mt-0.5">{formatDate(trackingResult.estimatedDelivery)}</p>
                </div>
              </div>
            </div>

            {/* Status Narrative Callout */}
            <div className="rounded-lg p-5 border border-[#C5A880]/40 bg-[#C5A880]/5 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-[#C5A880] shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-sm font-semibold text-foreground mb-1">
                    Fulfillment Notice
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {trackingResult.status === "pending" && "Your order has been registered and is scheduled for atelier compounding and quality inspection."}
                    {trackingResult.status === "processing" && "Your flacon is being hand-bottled, inspected, and packaged in our presentation gift box."}
                    {trackingResult.status === "shipped" && (
                      <>
                        Your package has been securely sealed and handed over to our courier partner.
                        {trackingResult.trackingNumber && (
                          <> Waybill tracking code: <strong className="font-mono text-foreground px-1.5 py-0.5 bg-card border rounded ml-1 break-all">{trackingResult.trackingNumber}</strong>.</>
                        )}
                      </>
                    )}
                    {trackingResult.status === "delivered" && "Your shipment has arrived at your destination. May your new fragrance bring you endless delight."}
                  </p>
                  {trackingResult.status === "shipped" && carrierTrackingUrl && (
                    <div className="mt-3">
                      <a
                        href={carrierTrackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C5A880] hover:underline focus:outline-none focus:ring-1 focus:ring-[#C5A880] rounded px-1 py-0.5"
                      >
                        Track on carrier portal
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="pt-4 border-t border-border flex justify-between text-[11px] text-muted-foreground">
              <span>Created: {formatDate(trackingResult.createdAt)}</span>
              <span>Updated: {formatDate(trackingResult.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderTracking;
