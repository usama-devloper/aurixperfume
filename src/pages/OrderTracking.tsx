import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, Truck, CheckCircle2, Clock, MapPin, Calendar, Hash } from "lucide-react";

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
  { status: "processing", label: "Processing", icon: Package },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: CheckCircle2 },
];

const CARRIER_LABELS: Record<string, string> = {
  fedex: "FedEx",
  ups: "UPS",
  usps: "USPS",
  dhl: "DHL",
  bluedart: "Blue Dart",
  dtdc: "DTDC",
  delhivery: "Delhivery",
  other: "Other",
};

const OrderTracking = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const query = searchQuery.trim();
    if (!query) {
      setError("Please enter a tracking number or order ID");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setTrackingResult(null);
    
    try {
      // First try secure RPC if available
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

      // Fallback for environments where RPC is not yet pushed
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
    if (!dateString) return "Not available";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-serif mb-4 text-white uppercase tracking-wider">Order Tracking</h1>
          <p className="text-gray-400">Enter your order ID or tracking number to see its current status.</p>
        </div>

        {/* Search Card */}
        <Card className="mb-8 border border-neutral-800 bg-neutral-900 rounded-none shadow-none">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="searchQuery" className="text-gray-300">Order ID or Tracking Number</Label>
                <div className="flex gap-3 mt-2">
                  <Input
                    id="searchQuery"
                    placeholder="e.g. ORD-12345 or TRACK-987"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold"
                  />
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-32 rounded-none bg-perfume-gold text-black hover:bg-yellow-600 uppercase tracking-widest text-[10px] font-bold"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Track"}
                  </Button>
                </div>
                {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results Card */}
        {trackingResult && (
          <Card className="border border-neutral-800 bg-neutral-900 rounded-none shadow-none animate-fade-in overflow-hidden mt-8">
            <CardHeader className="bg-[#0A0A0A] border-b border-neutral-800 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-serif text-white uppercase tracking-widest">Order Status</CardTitle>
                <span className="text-sm font-medium text-perfume-gold font-mono">
                  {trackingResult.orderNumber}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-8 pb-6">
              {/* Status Timeline */}
              <div className="mb-8">
                <div className="flex justify-between items-start relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-0 right-0 h-[1px] bg-neutral-800 mx-8">
                    <div 
                      className="h-full bg-perfume-gold transition-all duration-1000 ease-in-out" 
                      style={{ width: `${(getStatusIndex(trackingResult.status) / (STATUS_STEPS.length - 1)) * 100}%` }}
                    />
                  </div>
                  
                  {STATUS_STEPS.map((step, index) => {
                    const currentIndex = getStatusIndex(trackingResult.status);
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;
                    const Icon = step.icon;
                    
                    return (
                      <div key={step.status} className="flex flex-col items-center z-10 flex-1 group">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border ${
                          isCompleted 
                            ? "bg-perfume-gold text-black border-perfume-gold" 
                            : "bg-[#0A0A0A] text-gray-500 border-neutral-800"
                        } ${isCurrent ? "ring-4 ring-perfume-gold/20 shadow-[0_0_15px_rgba(202,165,80,0.5)]" : ""}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className={`text-[10px] mt-3 uppercase tracking-widest text-center transition-colors duration-300 ${
                          isCompleted ? "text-perfume-gold font-bold" : "text-gray-500 font-medium"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start gap-4 p-5 border border-neutral-800 bg-[#0A0A0A]">
                  <div className="bg-neutral-900 p-2 rounded-full mt-0.5">
                    <Hash className="h-4 w-4 text-perfume-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Order Number</p>
                    <p className="font-mono text-gray-200">{trackingResult.orderNumber}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-5 border border-neutral-800 bg-[#0A0A0A]">
                  <div className="bg-neutral-900 p-2 rounded-full mt-0.5">
                    <Calendar className="h-4 w-4 text-perfume-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Order Date</p>
                    <p className="text-gray-200">{formatDate(trackingResult.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 border border-neutral-800 bg-[#0A0A0A]">
                  <div className="bg-neutral-900 p-2 rounded-full mt-0.5">
                    <Truck className="h-4 w-4 text-perfume-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Shipping Carrier</p>
                    <p className="text-gray-200">
                      {trackingResult.shippingCarrier ? CARRIER_LABELS[trackingResult.shippingCarrier] || trackingResult.shippingCarrier : "Pending processing"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 border border-neutral-800 bg-[#0A0A0A]">
                  <div className="bg-neutral-900 p-2 rounded-full mt-0.5">
                    <MapPin className="h-4 w-4 text-perfume-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Est. Delivery</p>
                    <p className="text-gray-200">{formatDate(trackingResult.estimatedDelivery)}</p>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div className="bg-neutral-900 border border-perfume-gold/30 rounded-none p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-perfume-gold"></div>
                <h3 className="font-serif mb-2 flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-4 w-4 text-perfume-gold" />
                  Status Update
                </h3>
                <p className="text-sm text-gray-400 pl-6">
                  {trackingResult.status === "pending" && "Your order has been received and is awaiting processing. We'll update you once it's being prepared."}
                  {trackingResult.status === "processing" && "Great news! Your order is being prepared and will be shipped soon."}
                  {trackingResult.status === "shipped" && (
                    <>
                      Your order is on its way!
                      {trackingResult.trackingNumber && trackingResult.shippingCarrier && (
                        <> Track it with {CARRIER_LABELS[trackingResult.shippingCarrier] || trackingResult.shippingCarrier} using tracking number <strong className="text-white font-mono bg-[#0A0A0A] px-2 py-0.5 ml-1">{trackingResult.trackingNumber}</strong>.</>
                      )}
                    </>
                  )}
                  {trackingResult.status === "delivered" && "Your order has been delivered successfully. Thank you for shopping with us!"}
                </p>
              </div>

              {/* Timestamps */}
              <div className="mt-4 pt-4 border-t flex justify-between text-xs text-muted-foreground">
                <span>Ordered: {formatDate(trackingResult.createdAt)}</span>
                <span>Last updated: {formatDate(trackingResult.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
