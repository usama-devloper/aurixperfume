import { Link } from "react-router-dom";
import { ShieldCheck, Lock, Eye, FileText, Database, Mail, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Header */}
      <section className="py-16 lg:py-20 text-center border-b border-border/80 bg-[#F7F4EE] dark:bg-[#141211]">
        <div className="container mx-auto px-4 max-w-3xl">
          <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
            Client Sanctuary & Trust
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium text-foreground tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            At AURIX, we treat your personal data with the same discretion and reverence as our rarest fragrance extractions.
          </p>
          <p className="text-[11px] text-[#C5A880] font-mono mt-3">
            Effective Date: November 2026
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
                  <Eye className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  1. Information We Collect
                </h2>
              </div>
              <p>
                To provide bespoke fragrance consultations and fulfill luxury orders across India, we collect only the information necessary to serve your relationship with the Maison:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong className="text-foreground">Identity & Account Details:</strong> Name, email address, phone number, and password credentials managed securely via Supabase Authentication and Google OAuth.</li>
                <li><strong className="text-foreground">Fulfillment Details:</strong> Recipient name, street address, city, state, postal code, and contact telephone stored for parcel delivery.</li>
                <li><strong className="text-foreground">Transactional Records:</strong> Order references, items purchased, totals, and payment status.</li>
                <li><strong className="text-foreground">Client Inquiries:</strong> Correspondence sent to our concierge or through return and issue request forms.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 2 */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  2. Payment & Cardholder Security
                </h2>
              </div>
              <p>
                Your financial security is paramount. AURIX does not store, process, or transmit raw credit card or debit card numbers on our infrastructure:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong className="text-foreground">Stripe Payments:</strong> Card payments are encrypted and processed directly via Stripe PCI-DSS Level 1 compliant gateways. Only tokenized settlement status is returned to our system.</li>
                <li><strong className="text-foreground">UPI Settlements:</strong> When paying via UPI, you provide a Unique Transaction Reference (UTR) strictly to enable our accounting team to match your reservation.</li>
                <li><strong className="text-foreground">Cash on Delivery:</strong> Contact information is utilized by courier associates solely at time of physical handover.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 3 */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  3. Logistics Partners & Data Sharing
                </h2>
              </div>
              <p>
                We do not sell, rent, or trade your personal information. Shipping details are shared solely with authorized domestic courier partners for package routing and delivery:
              </p>
              <p>
                Our verified shipping network includes FedEx Express, UPS, USPS, DHL Express, Delhivery, Blue Dart, and DTDC Express. These carriers receive only the dispatch data required to transport your package safely from our Central Atelier in Ahmedabad to your destination.
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
                  4. Public Order Tracking Privacy
                </h2>
              </div>
              <p>
                Our public Order Tracking portal utilizes secure database functions that prevent enumeration attacks. Public order queries display only milestone status (e.g., Order Placed, Preparation, In Transit, Delivered) and carrier waybills. Public tracking responses deliberately exclude customer names, phone numbers, delivery addresses, and payment amounts.
              </p>
            </CardContent>
          </Card>

          {/* Section 5 */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  5. Local Storage & Website Preferences
                </h2>
              </div>
              <p>
                We respect your online privacy. AURIX does not deploy invasive tracking pixels or cross-site advertising networks. We use client-side local browser storage strictly for essential functional operations:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Preserving your authenticated customer session.</li>
                <li>Retaining items added to your shopping bag.</li>
                <li>Remembering your luxury theme preference (Light or Dark palette).</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 6 */}
          <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5A880]/10 flex items-center justify-center text-[#C5A880] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  6. Your Rights & Concierge Contact
                </h2>
              </div>
              <p>
                You retain complete sovereignty over your profile. You may review, edit, or request deletion of your account and saved shipping addresses at any time through your <Link to="/profile" className="text-[#C5A880] hover:underline font-medium">Customer Account</Link> or by writing to our concierge team:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg border border-border/80 text-xs space-y-1">
                <p><strong className="text-foreground">Official Client Care:</strong> <a href="mailto:aurixperfume25@gmail.com" className="text-[#C5A880] hover:underline">aurixperfume25@gmail.com</a></p>
                <p><strong className="text-foreground">Telephone Concierge:</strong> <a href="tel:+919104455400" className="text-[#C5A880] hover:underline">+91-9104455400</a></p>
                <p><strong className="text-foreground">Atelier Address:</strong> Ahmedabad - 380001, Gujarat, India</p>
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

export default PrivacyPolicy;

