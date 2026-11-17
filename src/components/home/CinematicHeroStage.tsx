import { motion } from 'framer-motion';

export type CinematicTheme = 'golden-essence' | 'crystalline-brilliance' | 'royal-oud';

export interface CinematicHeroStageProps {
  theme: CinematicTheme;
  animStage?: 'floating' | 'converging' | 'revealed';
  hasConverged?: boolean;
  shouldReduceMotion?: boolean;
  sequenceKey?: number;
  flaconSrc: string;
  flaconTitle: string;
  flaconSubtitle: string;
}

/**
 * Editorial Luxury Product Showcase Stage
 * Displays ONE dominant, beautiful perfume product image with natural drop shadow,
 * soft atmospheric backlighting, and a clean typographic caption beneath.
 * Absolutely zero canvas loops, zero floating particles, and zero card borders.
 */
const CinematicHeroStage = ({
  theme,
  flaconSrc,
  flaconTitle,
  flaconSubtitle,
  shouldReduceMotion = false,
}: CinematicHeroStageProps) => {
  // Soft, restrained ambient glow behind the bottle to accentuate contrast
  const getGlowColor = () => {
    if (theme === 'crystalline-brilliance') {
      return 'radial-gradient(circle at 50% 50%, rgba(147, 197, 253, 0.12) 0%, transparent 70%)';
    }
    if (theme === 'royal-oud') {
      return 'radial-gradient(circle at 50% 50%, rgba(217, 119, 6, 0.14) 0%, transparent 70%)';
    }
    return 'radial-gradient(circle at 50% 50%, rgba(199, 166, 117, 0.16) 0%, transparent 70%)';
  };

  return (
    <div
      className="relative w-full flex flex-col items-center justify-center select-none py-2"
      aria-label="Featured perfume showcase"
    >
      {/* Soft restrained ambient glow behind the bottle */}
      <div
        className="absolute inset-0 pointer-events-none rounded-full blur-3xl opacity-60 transition-all duration-700"
        style={{ background: getGlowColor() }}
      />

      {/* The Single Master Perfume Bottle */}
      <motion.div
        key={flaconTitle}
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0.85, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full flex items-center justify-center"
      >
        <img
          src={flaconSrc}
          alt={flaconTitle}
          className="w-auto h-auto max-h-[250px] sm:max-h-[300px] lg:max-h-[350px] xl:max-h-[390px] max-w-[210px] sm:max-w-[260px] lg:max-w-[310px] xl:max-w-[350px] object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] rounded-lg transition-transform duration-700 ease-out hover:scale-[1.02]"
        />
      </motion.div>

      {/* Natural floor shadow */}
      <div className="w-40 sm:w-52 lg:w-60 xl:w-68 h-3 sm:h-3.5 lg:h-4 mt-1.5 sm:mt-2 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.8)_0%,transparent_70%)] blur-[2px] pointer-events-none" />

      {/* Product Caption placed naturally beneath the image */}
      <div className="mt-2 sm:mt-2.5 lg:mt-3 text-center">
        <span className="font-serif text-xs sm:text-sm font-medium tracking-[0.28em] uppercase text-[#F7F3EC] block">
          {flaconTitle}
        </span>
        <span className="text-[10px] sm:text-xs text-[#C7A675] tracking-[0.22em] uppercase block mt-1 font-sans font-light">
          {flaconSubtitle}
        </span>
      </div>
    </div>
  );
};

export default CinematicHeroStage;
