import { Link } from "react-router-dom";
import { Truck, ShieldCheck, Clock, MapPin, Package, AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const carriers = [
  { name: "FedEx Express", desc: "Express priority air transit across major metropolitan routes" },
  { name: "Delhivery", desc: "Comprehensive domestic network serving 18,000+ pin codes" },
  { name: "Blue Dart", desc: "Specialized secure parcel transport and tracking" },
  { name: "DTDC Express", desc: "Reliable surface and express regional coverage" },
  { name: "DHL Express", desc: "International and premier domestic express logistics" },
  { name: "UPS", desc: "Global express carriage partner" },
  { name: "USPS", desc: "Select international postal handovers" },
];

const Shipping = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Header */}
      <section className="py-16 lg:py-20 text-center border-b border-border/80 bg-[#F7F4EE] dark:bg-[#141211]">
        <div className="container mx-auto px-4 max-w-3xl">
          <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
            Atelier Logistics & Client Care
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium text-foreground tracking-tight mb-4">
            Shipping & Delivery
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            From our compounding stills in Ahmedabad to your private collection, each bespoke creation is packaged in presentation gift boxes and dispatched with utmost care.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-16 container mx-auto px-4 lg:px-8 max-w-4xl">
        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          {/* Complimentary Shipping Banner */}
          <div className="rounded-xl p-6 sm:p-8 border border-[#C5A880]/50 bg-[#C5A880]/10 text-foreground relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#C5A880]/20 flex items-center justify-center text-[#C5A880] shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-semibold">Complimentary Domestic Shipping</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Applied automatically to all orders of ₹1,000 or above across India.</p>
                </div>
              </div>
              <Button asChild className="btn-gold shrink-0 text-xs uppercase tracking-wider font-semibold">
                <Link to="/products">Explore Gallery</Link>
              </Button>
            </div>
          </div>

          {/* Rates & Thresholds */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  Shipping Rates & Delivery Thresholds
                </h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-lg bg-muted/40 border border-border/70">
                  <span className="text-[11px] font-semibold text-[#C5A880] uppercase tracking-wider block">Orders ₹1,000 & Above</span>
                  <p className="text-xl font-serif font-bold text-foreground mt-1">₹0 (Free)</p>
                  <p className="text-xs text-muted-foreground mt-1">Complimentary courier transit with full insurance and tracking.</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/40 border border-border/70">
                  <span className="text-[11px] font-semibold text-[#C5A880] uppercase tracking-wider block">Orders Below ₹1,000</span>
                  <p className="text-xl font-serif font-bold text-foreground mt-1">₹400</p>
                  <p className="text-xs text-muted-foreground mt-1">Flat courier delivery charge applied at checkout.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dispatch Origin & Timeline */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  Dispatch Origin & Delivery Estimates
                </h3>
              </div>
              <p>
                All creations are inspected, bottled, and dispatched directly from our atelier:
              </p>
              <div className="p-4 rounded-lg bg-muted/40 border border-border/70 text-xs">
                <strong className="text-foreground">Central Atelier:</strong> Ahmedabad - 380001, Gujarat, India
              </div>
              <p>
                Actual delivery times vary depending upon your geographic destination pin code, local courier routing, and seasonal demand. Metros typically receive parcels faster than remote regional areas. You will receive an automated tracking code once your parcel is sealed and accepted by our courier partner.
              </p>
            </CardContent>
          </Card>

          {/* Supported Courier Network */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  Verified Courier Partners
                </h3>
              </div>
              <p>
                We collaborate with authorized domestic and international logistics providers to ensure parcel integrity:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {carriers.map((c) => (
                  <div key={c.name} className="p-3.5 rounded-lg border border-border/60 bg-muted/30">
                    <p className="font-semibold text-xs text-foreground">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{c.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tracking Instructions */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  Real-Time Tracking & Notifications
                </h3>
              </div>
              <p>
                You can follow your parcel at every milestone from our compounding facility to your doorstep using our dedicated concierge portal:
              </p>
              <div className="pt-2">
                <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold">
                  <Link to="/order-tracking" className="inline-flex items-center gap-2">
                    Open Track Order Portal <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Damaged or Delayed Shipments */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  Damaged, Leaking, or Delayed Shipments
                </h3>
              </div>
              <p>
                Every flacon is securely seated in protective foam and impact-resistant cartons. In the rare event that a package arrives damaged, leaking, or materially delayed:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Submit photos and your order details directly through our <Link to="/return-request" className="text-[#C5A880] hover:underline font-medium">Return & Issue Request Portal</Link>.</li>
                <li>Or email our concierge immediately at <a href="mailto:aurixperfume25@gmail.com" className="text-[#C5A880] hover:underline font-medium">aurixperfume25@gmail.com</a> with your Order Reference.</li>
                <li>Our client care team will review your report promptly to arrange an expedited replacement.</li>
              </ul>
            </CardContent>
          </Card>

        </div>

        {/* Back CTA */}
        <div className="mt-12 text-center">
          <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold">
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Maison
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Shipping;

