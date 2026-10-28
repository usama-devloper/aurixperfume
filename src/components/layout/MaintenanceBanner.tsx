import { Sparkles, Phone, Mail } from "lucide-react";
import { useReducedMotion } from "framer-motion";

const MaintenanceBanner = () => {
  const shouldReduceMotion = useReducedMotion();

  const marqueeItem = (
    <div className="flex items-center gap-8 shrink-0 px-4 text-[11px] tracking-[0.2em] uppercase font-medium text-[#FAF8F5]/90">
      <span className="inline-flex items-center gap-2">
        <Sparkles className="h-3 w-3 text-[#C5A880] shrink-0" />
        <span className="font-semibold text-[#FAF8F5]">COMPLIMENTARY SHIPPING ON ORDERS OVER ₹1,000</span>
      </span>
      <span className="text-[#C5A880]/50 select-none">•</span>
      <span className="inline-flex items-center gap-2">
        <span className="text-[#C5A880]">HAUTE PARFUMERIE & PURE ATTARS</span>
      </span>
      <span className="text-[#C5A880]/50 select-none">•</span>
      <span className="inline-flex items-center gap-2">
        <span className="text-[#78716C]">CONCIERGE:</span>
        <a 
          href="tel:+919104455400" 
          className="text-[#C5A880] font-semibold hover:text-[#FAF8F5] transition-colors underline-offset-4 hover:underline tracking-wider"
        >
          +91-9104455400
        </a>
        <span className="text-[#78716C]">/</span>
        <a 
          href="mailto:malikusama95@gmail.com" 
          className="text-[#C5A880] font-semibold hover:text-[#FAF8F5] transition-colors lowercase tracking-normal underline-offset-4 hover:underline"
        >
          malikusama95@gmail.com
        </a>
      </span>
      <span className="text-[#C5A880]/50 select-none">•</span>
      <span className="inline-flex items-center gap-2">
        <span className="text-[#FAF8F5]/80">HANDCRAFTED ARTISANAL COMPOSITIONS</span>
      </span>
      <span className="text-[#C5A880]/50 select-none">•</span>
    </div>
  );

  return (
    <aside 
      aria-label="Store announcement" 
      className="relative w-full overflow-hidden bg-[#141211] border-b border-[#C5A880]/25 text-[#FAF8F5] py-1.5 group select-none"
    >
      {shouldReduceMotion ? (
        // Accessible Static Fallback when user prefers reduced motion
        <div className="container mx-auto px-4 flex items-center justify-center gap-3 text-center text-[11px] tracking-widest uppercase font-medium flex-wrap">
          <Sparkles className="h-3 w-3 text-[#C5A880] shrink-0" />
          <span className="font-semibold text-[#FAF8F5]">COMPLIMENTARY SHIPPING ON ORDERS OVER ₹1,000</span>
          <span className="text-[#C5A880]/60 hidden sm:inline">•</span>
          <span className="text-xs text-[#78716C] flex items-center gap-2">
            <span>Concierge:</span>
            <a href="tel:+919104455400" className="text-[#C5A880] font-semibold hover:underline">
              +91-9104455400
            </a>
            <span>or</span>
            <a href="mailto:malikusama95@gmail.com" className="text-[#C5A880] font-semibold lowercase tracking-normal hover:underline">
              malikusama95@gmail.com
            </a>
          </span>
        </div>
      ) : (
        // Smooth, seamless horizontal marquee with zero jump and pause on hover
        <div className="marquee-track flex w-max group-hover:[animation-play-state:paused]">
          {/* Segment 1 */}
          <div className="flex shrink-0">{marqueeItem}</div>
          {/* Segment 2 (Identical for seamless infinite loop) */}
          <div className="flex shrink-0" aria-hidden="true">{marqueeItem}</div>
        </div>
      )}

      <style>{`
        @keyframes luxuryMarquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .marquee-track {
          will-change: transform;
          animation: luxuryMarquee 38s linear infinite;
        }
        @media (max-width: 768px) {
          .marquee-track {
            animation-duration: 28s;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </aside>
  );
};

export default MaintenanceBanner;
