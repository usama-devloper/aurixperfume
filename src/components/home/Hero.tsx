import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import CinematicHeroStage, { CinematicTheme } from './CinematicHeroStage';

interface SlideConfig {
  id: number;
  theme: CinematicTheme;
  flaconSrc: string;
  flaconTitle: string;
  flaconSubtitle: string;
  kicker: string;
  title: string;
  italicTitle: string;
  description: string;
  primaryCtaLink: string;
  badge1Title: string;
  badge1Subtitle: string;
  badge2Title: string;
  badge2Subtitle: string;
  badge3Title: string;
  badge3Subtitle: string;
}

const SLIDES: SlideConfig[] = [
  {
    id: 1,
    theme: 'golden-essence',
    flaconSrc: '/oud-sovereign.jpg',
    flaconTitle: 'AURIX SOVEREIGN',
    flaconSubtitle: 'EXTRAIT DE PARFUM • 50 ML',
    kicker: 'HAUTE PARFUMERIE & PURE ATTARS',
    title: 'Discover Your',
    italicTitle: 'Signature Scent',
    description: 'Handcrafted with rare harvest-grade Taif rose, crystalline amber, and aged wild agarwood. Formulated in Grasse micro-batches to create a deeply personal olfactory presence that lingers like liquid memory.',
    primaryCtaLink: '/products',
    badge1Title: '100% Extrait',
    badge1Subtitle: 'CONCENTRATION',
    badge2Title: 'Micro-Batch',
    badge2Subtitle: 'CRAFTED WITH CARE',
    badge3Title: 'DISTINCTIVE SCENTS',
    badge3Subtitle: 'FIND YOUR SIGNATURE',
  },
  {
    id: 2,
    theme: 'crystalline-brilliance',
    flaconSrc: '/perfume1.jpg',
    flaconTitle: 'ECLAT DE LUMIERE',
    flaconSubtitle: 'CRYSTALLINE EXTRAIT • 75 ML',
    kicker: 'LUMINOUS CRYSTALLINE ELEGANCE',
    title: 'Radiance in',
    italicTitle: 'Pure Sunlight',
    description: 'A crystalline symphony of sparkling Mediterranean bergamot, crystalline white neroli, and crisp Virginia cedarwood. Designed for ethereal daytime grace and crystalline clarity.',
    primaryCtaLink: '/products?type=perfume',
    badge1Title: 'Pure Absolutes',
    badge1Subtitle: 'SOLAR MACERATION',
    badge2Title: 'Crystal Facet',
    badge2Subtitle: 'FLACON CUT',
    badge3Title: 'DISTINCTIVE SCENTS',
    badge3Subtitle: 'FIND YOUR SIGNATURE',
  },
  {
    id: 3,
    theme: 'royal-oud',
    flaconSrc: '/desert-saffron.jpg',
    flaconTitle: 'VELVET SAFFRON',
    flaconSubtitle: 'ROYAL OUD EXTRAIT • 50 ML',
    kicker: 'WARM SPICES & RARE AGARWOOD',
    title: 'Mesmerizing',
    italicTitle: 'Royal Oud',
    description: 'An intoxicating evening elixir woven from royal Persian saffron, warm Moroccan spices, dark vanilla bean, and centuries-aged vintage oud for an unforgettable presence.',
    primaryCtaLink: '/products?type=attar',
    badge1Title: 'Vintage Agarwood',
    badge1Subtitle: 'SINGLE HARVEST',
    badge2Title: 'Aged Saffron',
    badge2Subtitle: 'PURE DISTILLATION',
    badge3Title: 'DISTINCTIVE SCENTS',
    badge3Subtitle: 'FIND YOUR SIGNATURE',
  },
];

const AUTO_ROTATE_INTERVAL_MS = 8000;

const Hero = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goToPrevious = useCallback(() => {
    clearTimer();
    setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, [clearTimer]);

  const goToNext = useCallback(() => {
    clearTimer();
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
  }, [clearTimer]);

  const selectSlide = useCallback((index: number) => {
    if (index === currentIndex) return;
    clearTimer();
    setCurrentIndex(index);
  }, [currentIndex, clearTimer]);

  // Clean auto-advance rotation with hover pause
  useEffect(() => {
    clearTimer();

    if (!isPaused) {
      timerRef.current = window.setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
      }, AUTO_ROTATE_INTERVAL_MS);
    }

    return () => clearTimer();
  }, [currentIndex, isPaused, clearTimer]);

  const activeSlide = SLIDES[currentIndex];

  return (
    <section 
      aria-label="Hero showcase" 
      className="relative w-full overflow-hidden bg-[#0A0807] flex items-center justify-center select-none lg:min-h-[580px] xl:min-h-[640px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Subtle, restrained ambient luxury background gradient (NO oversized background bottle) */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 75% 50%, rgba(28, 22, 18, 0.75) 0%, #0A0807 70%)'
        }}
      />

      {/* Main Editorial Hero Container: Clean 2-Column Balanced Layout */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 xl:py-12 relative z-10 w-full max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 xl:gap-12 items-center">
          
          {/* Left Column (Desktop: ~48% width, Mobile: order-2) - Refined Editorial Typography */}
          <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-4 sm:space-y-5 xl:space-y-6 order-2 lg:order-1 max-w-xl mx-auto lg:mx-0">
            
            {/* 1. Brand Eyebrow & Tagline */}
            <motion.div 
              key={`kicker-${activeSlide.id}`}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2 sm:gap-2.5 lg:gap-3"
            >
              <span className="text-xs sm:text-sm font-serif font-medium tracking-[0.3em] sm:tracking-[0.35em] text-[#C7A675] uppercase">
                AURIX PERFUME
              </span>
              <span className="w-4 sm:w-6 lg:w-8 h-[1px] bg-[#C7A675]/40" />
              <span className="text-[10px] sm:text-xs font-sans font-light tracking-[0.18em] sm:tracking-[0.22em] text-[#A8A29E] uppercase">
                {activeSlide.kicker}
              </span>
            </motion.div>

            {/* 2. Main Display Headline */}
            <motion.h1 
              key={`title-${activeSlide.id}`}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-serif font-normal text-[#F7F3EC] tracking-tight leading-[1.12]"
            >
              {activeSlide.title} <br />
              <span className="italic font-normal text-[#C7A675]">{activeSlide.italicTitle}</span>
            </motion.h1>

            {/* 3. Concise Fragrance Description */}
            <motion.p 
              key={`desc-${activeSlide.id}`}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xs sm:text-sm lg:text-sm xl:text-base text-[#D6D3D1] font-light leading-relaxed max-w-lg"
            >
              {activeSlide.description}
            </motion.p>

            {/* 4. Refined CTA Buttons */}
            <motion.div 
              key={`cta-${activeSlide.id}`}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto pt-1 sm:pt-1.5"
            >
              <Link 
                to={activeSlide.primaryCtaLink} 
                className="w-full sm:w-auto bg-[#F7F3EC] text-[#0A0807] hover:bg-[#C7A675] hover:text-[#0A0807] px-7 sm:px-8 py-3 sm:py-3.5 font-sans font-medium tracking-[0.2em] uppercase text-xs transition-colors rounded-sm shadow-md flex items-center justify-center text-center"
              >
                EXPLORE COLLECTION
              </Link>
              <Link 
                to="/about" 
                className="w-full sm:w-auto border border-[#F7F3EC]/30 text-[#F7F3EC] hover:border-[#C7A675] hover:text-[#C7A675] px-7 sm:px-8 py-3 sm:py-3.5 font-sans font-medium tracking-[0.2em] uppercase text-xs transition-colors rounded-sm flex items-center justify-center text-center backdrop-blur-sm"
              >
                OUR PHILOSOPHY
              </Link>
            </motion.div>

            {/* 5. Horizontal Benefits Row */}
            <div className="pt-4 sm:pt-4.5 lg:pt-5 border-t border-[#F7F3EC]/10 grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-lg text-center lg:text-left">
              <div>
                <span className="block text-xs sm:text-sm font-serif text-[#C7A675] font-medium">{activeSlide.badge1Title}</span>
                <span className="block text-[9px] sm:text-[10px] text-[#A8A29E] uppercase tracking-wider mt-0.5">{activeSlide.badge1Subtitle}</span>
              </div>
              <div>
                <span className="block text-xs sm:text-sm font-serif text-[#C7A675] font-medium">{activeSlide.badge2Title}</span>
                <span className="block text-[9px] sm:text-[10px] text-[#A8A29E] uppercase tracking-wider mt-0.5">{activeSlide.badge2Subtitle}</span>
              </div>
              <div>
                <span className="block text-xs sm:text-sm font-serif text-[#C7A675] font-medium">{activeSlide.badge3Title}</span>
                <span className="block text-[9px] sm:text-[10px] text-[#A8A29E] uppercase tracking-wider mt-0.5">{activeSlide.badge3Subtitle}</span>
              </div>
            </div>
          </div>

          {/* Right Column (Desktop: ~50% width, Mobile: order-1) - One Dominant Hero Product */}
          <div className="lg:col-span-6 relative w-full flex items-center justify-center order-1 lg:order-2">
            <CinematicHeroStage
              theme={activeSlide.theme}
              flaconSrc={activeSlide.flaconSrc}
              flaconTitle={activeSlide.flaconTitle}
              flaconSubtitle={activeSlide.flaconSubtitle}
              shouldReduceMotion={shouldReduceMotion ?? false}
            />
          </div>

        </div>
      </div>

      {/* Navigation Arrows (Restrained Glassmorphism) */}
      <button
        onClick={goToPrevious}
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/25 hover:bg-black/55 text-[#F7F3EC] backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-30 hover:scale-105 active:scale-95"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      
      <button
        onClick={goToNext}
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/25 hover:bg-black/55 text-[#F7F3EC] backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-30 hover:scale-105 active:scale-95"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Clean Slide Pagination Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-30">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => selectSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex 
                ? 'w-8 h-1 bg-[#C7A675]' 
                : 'w-2 h-1 bg-white/30 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
