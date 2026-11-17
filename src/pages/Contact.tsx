import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSiteSetting } from "@/hooks/useSiteSettings";

const isValidUrl = (url?: string | null): boolean => {
  if (!url || url === "#") return false;
  return /^https?:\/\//i.test(url.trim());
};

const Contact = () => {
  const facebookUrl = useSiteSetting('social_facebook') || 'https://www.facebook.com/aurixperfume25/';
  const instagramUrl = useSiteSetting('social_instagram');
  const twitterUrl = useSiteSetting('social_twitter');
  const officialEmail = useSiteSetting('contact_email') || 'aurixperfume25@gmail.com';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="py-16 lg:py-20 text-center border-b border-border/80 bg-[#F7F4EE] dark:bg-[#141211]">
        <div className="container mx-auto px-4 max-w-2xl">
          <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
            Atelier Concierge
          </span>
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-foreground tracking-tight mb-3">
            Client Consultation
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We invite your inquiries regarding bespoke scent profiling, private gifting commissions, or order assistance.
          </p>
        </div>
      </section>

      {/* Contact Info Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid sm:grid-cols-3 gap-8">
            {/* Phone */}
            <Card className="text-center bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-8 pb-6">
                <div className="w-14 h-14 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4 border border-border/60">
                  <Phone className="w-5 h-5 text-[#C5A880]" />
                </div>
                <h3 className="font-serif text-base font-semibold text-foreground mb-1">Telephone</h3>
                <p className="text-xs text-muted-foreground mb-3">Mon – Sat, 10am to 7pm IST</p>
                <a 
                  href="tel:+919104455400" 
                  className="text-xs text-[#C5A880] hover:underline font-semibold tracking-wider"
                >
                  +91-9104455400
                </a>
              </CardContent>
            </Card>

            {/* Email */}
            <Card className="text-center bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-8 pb-6">
                <div className="w-14 h-14 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4 border border-border/60">
                  <Mail className="w-5 h-5 text-[#C5A880]" />
                </div>
                <h3 className="font-serif text-base font-semibold text-foreground mb-1">Direct Correspondence</h3>
                <p className="text-xs text-muted-foreground mb-3">Dedicated client response</p>
                <a 
                  href={`mailto:${officialEmail}`} 
                  className="text-xs text-[#C5A880] hover:underline font-semibold tracking-wider"
                >
                  {officialEmail}
                </a>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="text-center bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-8 pb-6">
                <div className="w-14 h-14 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4 border border-border/60">
                  <MapPin className="w-5 h-5 text-[#C5A880]" />
                </div>
                <h3 className="font-serif text-base font-semibold text-foreground mb-1">Main Atelier</h3>
                <p className="text-xs text-muted-foreground mb-3">By private appointment only</p>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Ahmedabad - 380001,<br />
                  Gujarat, India
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Social Media - only render valid external URLs */}
          <div className="mt-16 text-center">
            <h3 className="font-serif text-base font-semibold text-foreground mb-4">Follow the Maison</h3>
            <div className="flex items-center justify-center gap-4">
              {isValidUrl(facebookUrl) && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-[#C5A880] hover:border-[#C5A880] transition-colors shadow-sm">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {isValidUrl(instagramUrl) && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-[#C5A880] hover:border-[#C5A880] transition-colors shadow-sm">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {isValidUrl(twitterUrl) && (
                <a href={twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-[#C5A880] hover:border-[#C5A880] transition-colors shadow-sm">
                  <Twitter className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
