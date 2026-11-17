import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, HelpCircle, Sparkles, ArrowLeft, MessageSquare, Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  id: string;
  category: "products" | "orders" | "shipping" | "returns" | "account" | "support";
  question: string;
  answer: string | React.ReactNode;
}

const FAQ_ITEMS: FAQItem[] = [
  // Products
  {
    id: "prod-1",
    category: "products",
    question: "What is the difference between Eau de Parfum (EDP) and Pure Artisanal Attar?",
    answer: "Eau de Parfum (EDP) formulations utilize high-grade perfumer's organic alcohol as a carrier, typically with 18% to 25% fragrance oil concentration, designed for expressive sillage and projection. Pure Attars are traditional, alcohol-free oil distillations compounded with precious woods and botanicals (such as sandalwood or agarwood base), designed to be applied directly to pulse points for intimate, long-lasting diffusion.",
  },
  {
    id: "prod-2",
    category: "products",
    question: "How long can I expect an AURIX fragrance to last on my skin?",
    answer: "Because our formulations rely heavily on harvest-grade botanical absolutes, precious resins, and natural musks, skin longevity ranges between 8 to 14+ hours depending upon skin chemistry, moisture, temperature, and olfactive family (woody, amber, and oriental notes typically project the longest).",
  },
  {
    id: "prod-3",
    category: "products",
    question: "How should I store my luxury perfume or attar flacon?",
    answer: "Store your bottles in a cool, dry sanctuary away from direct sunlight, high humidity, and extreme temperature fluctuations. Keep caps securely closed to prevent gradual oxidation of delicate citrus and floral top notes.",
  },
  {
    id: "prod-4",
    category: "products",
    question: "What is perfume maceration and why does AURIX practice it?",
    answer: "Maceration is the deliberate resting period where natural aromatic concentrates mature in alcohol or carrier oil. AURIX micro-batches are macerated for weeks to allow complex floral, resinous, and woody molecules to bind into a smooth, harmonious symphony.",
  },
  {
    id: "prod-5",
    category: "products",
    question: "Are AURIX fragrances 100% authentic and original formulations?",
    answer: "Yes. Every creation in our library is an original proprietary formulation compounded under the direction of our master perfumers in Ahmedabad. We do not sell diluted replicas or unauthorized imitations.",
  },

  // Orders
  {
    id: "ord-1",
    category: "orders",
    question: "How do I place an order on the website?",
    answer: "Browse our curated collection, select your desired flacons or attars, add them to your shopping bag, and proceed to checkout. You may checkout as a registered member or sign in easily via Google OAuth.",
  },
  {
    id: "ord-2",
    category: "orders",
    question: "Can I modify or cancel an order after placing it?",
    answer: "Because our packaging and inspection team begins bottling swiftly, please contact concierge at aurixperfume25@gmail.com or WhatsApp within 2 hours of order placement if you need to modify delivery addresses or items.",
  },
  {
    id: "ord-3",
    category: "orders",
    question: "Which payment methods are accepted?",
    answer: "We support Credit and Debit Cards (Visa, MasterCard, RuPay, Amex) encrypted via Stripe; instant UPI transfers (Google Pay, PhonePe, Paytm) with UTR recording; Cash on Delivery (COD) for eligible domestic pin codes; and Direct Concierge settlement via WhatsApp.",
  },
  {
    id: "ord-4",
    category: "orders",
    question: "How does UPI payment verification work?",
    answer: "When selecting UPI at checkout, you will see our verified UPI payment address or QR code. After completing the payment in your banking or UPI app, simply paste your 12-digit UTR (Unique Transaction Reference) number in the checkout form. Our team will verify and confirm your order promptly.",
  },

  // Shipping
  {
    id: "ship-1",
    category: "shipping",
    question: "What is the threshold for complimentary free shipping?",
    answer: "We provide complimentary insured express shipping across India on all orders of ₹1,000 or above. For orders below ₹1,000, a flat courier fee of ₹400 is applied at checkout.",
  },
  {
    id: "ship-2",
    category: "shipping",
    question: "Where do orders ship from and how long will delivery take?",
    answer: "All orders are dispatched from our Central Atelier in Ahmedabad - 380001, Gujarat, India. Delivery timelines depend upon the destination pin code and courier operations; metropolitan areas typically receive parcels in 3 to 5 business days, while regional locations may require 5 to 7 business days.",
  },
  {
    id: "ship-3",
    category: "shipping",
    question: "Which courier partners deliver AURIX packages?",
    answer: "We partner with verified express carriers including FedEx Express, Delhivery, Blue Dart, DTDC Express, and DHL Express. You can track your shipment anytime on our Order Tracking portal.",
  },
  {
    id: "ship-4",
    category: "shipping",
    question: "How do I track my order once it has dispatched?",
    answer: "Visit our dedicated Track Order page and input either your AURIX Order Reference (e.g. ORD-...) or your courier waybill tracking number to view real-time transit milestones.",
  },

  // Returns
  {
    id: "ret-1",
    category: "returns",
    question: "Can I return an opened or sprayed fragrance flacon?",
    answer: "Fine fragrances are intimate, hygiene-sensitive beauty formulations. For the safety and integrity of all patrons, ordinary change-of-mind returns for opened or tested bottles are restricted. We encourage consulting our detailed scent pyramids or reaching out to concierge before ordering.",
  },
  {
    id: "ret-2",
    category: "returns",
    question: "Are factory-sealed and unopened products eligible for return?",
    answer: "Yes. Flacons that remain completely unopened, in their original presentation box and tamper-evident seal, are eligible for review under our approved return policy. Submit your request via our Return Request portal.",
  },
  {
    id: "ret-3",
    category: "returns",
    question: "What should I do if my bottle arrives damaged, leaking, or incorrect?",
    answer: "If your parcel arrives damaged or differs from what you ordered, please submit a claim with clear photographs through our Return & Issue Request Portal or email aurixperfume25@gmail.com immediately. Our concierge team will review and arrange an expedited complimentary replacement.",
  },

  // Account
  {
    id: "acc-1",
    category: "account",
    question: "How do I create an account or sign in with Google?",
    answer: "Click the User icon in the top header and select 'Create account' or 'Sign in'. You can register with your email and password or use one-click Google OAuth for seamless authentication.",
  },
  {
    id: "acc-2",
    category: "account",
    question: "Where can I view my previous orders and saved delivery addresses?",
    answer: "When signed in, click on your profile menu and navigate to 'My Account' or 'My Orders' to view complete historical orders, track fulfillment, manage saved shipping addresses, and review your private wishlist.",
  },

  // Support
  {
    id: "sup-1",
    category: "support",
    question: "How do I contact the AURIX Atelier Concierge team?",
    answer: "You can reach our concierge via email at aurixperfume25@gmail.com, telephone at +91-9104455400 (Mon – Sat, 10am to 7pm IST), or via our Contact Consultation page.",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Questions" },
  { id: "products", label: "Fragrance & Craft" },
  { id: "orders", label: "Orders & Payment" },
  { id: "shipping", label: "Shipping & Delivery" },
  { id: "returns", label: "Returns & Exchanges" },
  { id: "account", label: "Account & Profile" },
  { id: "support", label: "Concierge Support" },
] as const;

const FAQ = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredItems = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        (typeof item.answer === "string" && item.answer.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Header */}
      <section className="py-16 lg:py-20 text-center border-b border-border/80 bg-[#F7F4EE] dark:bg-[#141211]">
        <div className="container mx-auto px-4 max-w-3xl">
          <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
            Atelier Knowledge & Assistance
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium text-foreground tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
            Explore our curated guidance regarding artisanal compounding, orders, shipping thresholds, and client care.
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Search questions by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-card border-border text-xs rounded-lg shadow-sm focus-visible:ring-[#C5A880]"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-16 container mx-auto px-4 lg:px-8 max-w-4xl">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#C5A880] text-[#1C1917] shadow-sm font-bold"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Accordion Questions */}
        {filteredItems.length > 0 ? (
          <div className="bg-card border border-border rounded-xl shadow-sm p-4 sm:p-6">
            <Accordion type="single" collapsible className="w-full">
              {filteredItems.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border-border/80">
                  <AccordionTrigger className="text-left font-serif text-sm sm:text-base text-foreground hover:text-[#C5A880] py-4 transition-colors">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : (
          <div className="text-center py-16 bg-card border border-border rounded-xl p-8">
            <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="font-serif text-lg text-foreground">No questions match your query</p>
            <p className="text-xs text-muted-foreground mt-1 mb-6">
              Try searching with different terms or contact our concierge directly.
            </p>
            <Button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              variant="outline"
              size="sm"
              className="text-xs uppercase tracking-wider font-semibold"
            >
              Reset Filters
            </Button>
          </div>
        )}

        {/* Concierge Help Box */}
        <div className="mt-14 p-6 sm:p-8 rounded-xl bg-muted/40 border border-border/80 text-center space-y-4">
          <MessageSquare className="w-8 h-8 text-[#C5A880] mx-auto" />
          <h3 className="font-serif text-lg font-semibold text-foreground">
            Still Have Inquiries?
          </h3>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Our atelier specialists are at your disposal for scent profiling, gifting guidance, and order support.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild className="btn-gold text-xs uppercase tracking-wider font-semibold">
              <a href="mailto:aurixperfume25@gmail.com" className="inline-flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> Email Concierge
              </a>
            </Button>
            <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold">
              <Link to="/contact">Contact Atelier</Link>
            </Button>
            <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold">
              <Link to="/return-request">Submit Issue Request</Link>
            </Button>
          </div>
        </div>

        {/* Back CTA */}
        <div className="mt-10 text-center">
          <Button asChild variant="ghost" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground">
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Maison
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default FAQ;

