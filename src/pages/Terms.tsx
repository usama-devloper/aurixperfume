import { Link } from "react-router-dom";
import { BookOpen, Scale, Sparkles, Truck, RefreshCw, ShieldCheck, Mail, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Header */}
      <section className="py-16 lg:py-20 text-center border-b border-border/80 bg-[#F7F4EE] dark:bg-[#141211]">
        <div className="container mx-auto px-4 max-w-3xl">
          <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
            Client Sanctuary & Governance
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium text-foreground tracking-tight mb-4">
            Terms & Conditions
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            These terms govern your acquisitions, consultations, and interactions with AURIX. By browsing or purchasing, you enter into this client charter.
          </p>
          <p className="text-[11px] text-[#C5A880] font-mono mt-3">
            Last Updated: November 2026
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-16 container mx-auto px-4 lg:px-8 max-w-4xl">
        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          {/* Section 1 */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  1. Maison Introduction & Acceptance
                </h2>
              </div>
              <p>
                AURIX is an independent artisanal perfumery studio founded in Ahmedabad, Gujarat, India, dedicated to the compounding of fine fragrances, pure attars, and bespoke olfactory creations. Access to and use of this website are conditioned upon acceptance of these terms and our <Link to="/privacy-policy" className="text-[#C5A880] hover:underline font-medium">Privacy Policy</Link>.
              </p>
            </CardContent>
          </Card>

          {/* Section 2 */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  2. Artisanal Nature & Product Descriptions
                </h2>
              </div>
              <p>
                Every AURIX flacon is hand-compounded in limited artisanal micro-batches utilizing natural resins, woods, and botanicals. Because natural harvest-grade essences vary gently across seasonal blooms, subtle variations in hue, depth, and opening notes are authentic characteristics of haute perfumery rather than defects. We strive to describe scent profiles, olfactive pyramids, and longevity with precision.
              </p>
            </CardContent>
          </Card>

          {/* Section 3 */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  3. Pricing, Orders & Currency
                </h2>
              </div>
              <p>
                All prices listed on AURIX are in Indian Rupees (INR ₹) and are authoritative as computed at checkout, inclusive of applicable taxes. Order submission constitutes an offer to purchase that is accepted when the order confirmation status is issued. We reserve the right to decline or cancel orders resulting from inadvertent typographical pricing errors or suspicious automated activity.
              </p>
            </CardContent>
          </Card>

          {/* Section 4 */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  4. Payment Terms & Settlement
                </h2>
              </div>
              <p>
                AURIX supports multiple secure settlement channels:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong className="text-foreground">Cards via Stripe:</strong> Authorized instantly via encrypted gateway.</li>
                <li><strong className="text-foreground">UPI Transfer:</strong> Orders are held pending receipt of your valid UTR (Unique Transaction Reference) code.</li>
                <li><strong className="text-foreground">Cash on Delivery:</strong> Available for select eligible pin codes; exact amount payable to courier associate.</li>
                <li><strong className="text-foreground">WhatsApp Concierge:</strong> Private bank transfer coordinated directly with atelier staff.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 5 */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  5. Shipping, Dispatch & Delivery
                </h2>
              </div>
              <p>
                Orders are dispatched from our Central Atelier in Ahmedabad - 380001, Gujarat, India.
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong className="text-foreground">Complimentary Courier Delivery:</strong> Provided automatically for all orders of ₹1,000 or above across India.</li>
                <li><strong className="text-foreground">Standard Delivery Charge:</strong> A flat ₹400 courier fee applies to orders below ₹1,000.</li>
                <li><strong className="text-foreground">Transit Milestones:</strong> Tracked via verified carriers (FedEx Express, UPS, USPS, DHL Express, Delhivery, Blue Dart, DTDC Express) on our <Link to="/order-tracking" className="text-[#C5A880] hover:underline font-medium">Order Tracking</Link> portal. Delivery times vary according to destination and courier operations.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 6 */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  6. Returns, Exchanges & Issue Resolution
                </h2>
              </div>
              <p>
                Fine perfumery and attars are intimate, hygiene-sensitive goods. Our resolution policy provides clear and equitable guidelines:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong className="text-foreground">Factory-Sealed Products:</strong> Unopened, unsealed bottles in original presentation packaging are eligible for return review under our approved framework.</li>
                <li><strong className="text-foreground">Opened / Sprayed Fragrances:</strong> For hygienic reasons and product integrity, change-of-mind returns for opened flacons are restricted.</li>
                <li><strong className="text-foreground">Damaged, Leaking or Incorrect Items:</strong> If a package arrives damaged in transit or differs from your order, submit a formal claim with photos via our <Link to="/return-request" className="text-[#C5A880] hover:underline font-medium">Return & Issue Request Portal</Link> for prompt review and replacement.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 7 */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  7. Intellectual Property & Concierge Contact
                </h2>
              </div>
              <p>
                All brand marks, imagery, formulations, editorial narratives, and website code are the exclusive intellectual property of AURIX. For questions regarding these terms, inquiries may be addressed to:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg border border-border/80 text-xs space-y-1">
                <p><strong className="text-foreground">Official Client Care:</strong> <a href="mailto:aurixperfume25@gmail.com" className="text-[#C5A880] hover:underline">aurixperfume25@gmail.com</a></p>
                <p><strong className="text-foreground">Telephone Concierge:</strong> <a href="tel:+919104455400" className="text-[#C5A880] hover:underline">+91-9104455400</a></p>
                <p><strong className="text-foreground">Studio Location:</strong> Ahmedabad - 380001, Gujarat, India</p>
              </div>
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

export default Terms;

