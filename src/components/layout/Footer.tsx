import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Mail, ShieldCheck, Truck, RefreshCw } from "lucide-react";
import { useSiteSetting } from "@/hooks/useSiteSettings";

const isValidUrl = (url?: string | null): boolean => {
  if (!url || url === "#") return false;
  return /^https?:\/\//i.test(url.trim());
};

const Footer = () => {
  const brandName = useSiteSetting('brand_name') || 'AURIX';
  const footerCopyright = useSiteSetting('footer_copyright');
  const facebookUrl = useSiteSetting('social_facebook') || 'https://www.facebook.com/aurixperfume25/';
  const instagramUrl = useSiteSetting('social_instagram');
  const twitterUrl = useSiteSetting('social_twitter');
  const emailAddress = useSiteSetting('contact_email') || 'aurixperfume25@gmail.com';
  
  return (
    <footer className="bg-[#1C1917] text-[#FAF8F5] pt-16 pb-12 border-t border-[#2D2926]">
      {/* Brand Perks Strip */}
      <div className="container mx-auto px-4 lg:px-8 pb-12 border-b border-[#2D2926]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#292524] flex items-center justify-center text-[#C5A880] flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#FAF8F5]">Complimentary Shipping</h3>
              <p className="text-xs text-[#78716C] mt-0.5">On all orders over ₹1,000 across India</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#292524] flex items-center justify-center text-[#C5A880] flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#FAF8F5]">Authenticity Guaranteed</h3>
              <p className="text-xs text-[#78716C] mt-0.5">100% genuine artisanal perfumes and attars</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#292524] flex items-center justify-center text-[#C5A880] flex-shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#FAF8F5]">Dedicated Concierge</h3>
              <p className="text-xs text-[#78716C] mt-0.5">White-glove consultation and support</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand & Mission */}
          <div className="md:col-span-2">
            <Link to="/" className="font-serif text-2xl font-bold tracking-[0.22em] text-[#FAF8F5] uppercase hover:text-[#C5A880] transition-colors">
              {brandName}
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-[#78716C] max-w-sm">
              Dedicated to the fine art of bespoke perfumery and traditional distillation. Every bottle is a symphony of raw botanicals, precious woods, and amber nuances crafted to evoke enduring memories.
            </p>
            {/* Social Media Links - only render valid external URLs */}
            <div className="flex items-center gap-4 mt-6">
              {isValidUrl(facebookUrl) && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-8 h-8 rounded-full bg-[#292524] flex items-center justify-center text-[#FAF8F5]/80 hover:text-[#C5A880] hover:bg-[#383330] transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              <a href={`mailto:${emailAddress}`} aria-label="Email" className="w-8 h-8 rounded-full bg-[#292524] flex items-center justify-center text-[#FAF8F5]/80 hover:text-[#C5A880] hover:bg-[#383330] transition-colors">
                <Mail className="h-4 w-4" />
              </a>
              {isValidUrl(instagramUrl) && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 rounded-full bg-[#292524] flex items-center justify-center text-[#FAF8F5]/80 hover:text-[#C5A880] hover:bg-[#383330] transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {isValidUrl(twitterUrl) && (
                <a href={twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="w-8 h-8 rounded-full bg-[#292524] flex items-center justify-center text-[#FAF8F5]/80 hover:text-[#C5A880] hover:bg-[#383330] transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          
          {/* Fragrances Links */}
          <div className="col-span-1">
            <h4 className="font-serif text-sm font-semibold tracking-wider text-[#FAF8F5] uppercase mb-4">Collection</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/products" className="text-[#78716C] hover:text-[#C5A880] transition-colors">All Perfumes</Link>
              </li>
              <li>
                <Link to="/products?type=attar" className="text-[#78716C] hover:text-[#C5A880] transition-colors">Artisanal Attars</Link>
              </li>
              <li>
                <Link to="/categories" className="text-[#78716C] hover:text-[#C5A880] transition-colors">Fragrance Families</Link>
              </li>
              <li>
                <Link to="/products?featured=true" className="text-[#78716C] hover:text-[#C5A880] transition-colors">Curated Bestsellers</Link>
              </li>
            </ul>
          </div>
          
          {/* Maison Links */}
          <div className="col-span-1">
            <h4 className="font-serif text-sm font-semibold tracking-wider text-[#FAF8F5] uppercase mb-4">Maison</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/about" className="text-[#78716C] hover:text-[#C5A880] transition-colors">Our Philosophy</Link>
              </li>
              <li>
                <Link to="/contact" className="text-[#78716C] hover:text-[#C5A880] transition-colors">Contact Concierge</Link>
              </li>
              <li>
                <Link to="/careers" className="text-[#78716C] hover:text-[#C5A880] transition-colors">Join Our Atelier</Link>
              </li>
            </ul>
          </div>
          
          {/* Client Service Links */}
          <div className="col-span-1">
            <h4 className="font-serif text-sm font-semibold tracking-wider text-[#FAF8F5] uppercase mb-4">Client Care</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/order-tracking" className="text-[#78716C] hover:text-[#C5A880] transition-colors">Track Your Order</Link>
              </li>
              <li>
                <Link to="/profile" className="text-[#78716C] hover:text-[#C5A880] transition-colors">Customer Account</Link>
              </li>
              <li>
                <Link to="/shipping" className="text-[#78716C] hover:text-[#C5A880] transition-colors">Shipping & Delivery</Link>
              </li>
              <li>
                <Link to="/return-request" className="text-[#78716C] hover:text-[#C5A880] transition-colors">Return Request</Link>
              </li>
              <li>
                <Link to="/faq" className="text-[#78716C] hover:text-[#C5A880] transition-colors">Frequently Asked</Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="border-t border-[#2D2926] mt-12 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-[#78716C] gap-4">
          <p>{footerCopyright || `© ${new Date().getFullYear()} ${brandName}. Handcrafted with precision. All rights reserved.`}</p>
          <div className="flex items-center gap-6">
            <span className="text-[#78716C]">Secure Checkout via Stripe & UPI</span>
            <Link to="/terms" className="hover:text-[#FAF8F5] transition-colors">Terms & Conditions</Link>
            <Link to="/privacy-policy" className="hover:text-[#FAF8F5] transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
