import React from 'react';

interface ScentPyramidProps {
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
}

export const ScentPyramid: React.FC<ScentPyramidProps> = ({ 
  topNotes = [], 
  middleNotes = [], 
  baseNotes = [] 
}) => {
  const safeTop = Array.isArray(topNotes) ? topNotes : [];
  const safeMiddle = Array.isArray(middleNotes) ? middleNotes : [];
  const safeBase = Array.isArray(baseNotes) ? baseNotes : [];

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto py-8 space-y-4">
      {/* Top Notes */}
      <div 
        className="w-1/2 border border-[#C5A880]/50 bg-card p-4 text-center rounded-md relative group hover:border-[#C5A880] transition-colors shadow-sm"
      >
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-card px-3 text-[9px] uppercase tracking-[0.2em] text-[#C5A880] font-semibold whitespace-nowrap border border-border/60 rounded-full">
          Top Notes
        </div>
        <span className="text-foreground text-xs font-medium">{safeTop.join(" • ") || "Artisanal accords"}</span>
      </div>
      
      {/* Heart Notes */}
      <div 
        className="w-3/4 border border-[#C5A880]/50 bg-card p-5 text-center rounded-md relative group hover:border-[#C5A880] transition-colors shadow-sm"
      >
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-card px-3 text-[9px] uppercase tracking-[0.2em] text-[#C5A880] font-semibold whitespace-nowrap border border-border/60 rounded-full">
          Heart Notes
        </div>
        <span className="text-foreground text-xs font-medium">{safeMiddle.join(" • ") || "Harmonious heart"}</span>
      </div>
      
      {/* Base Notes */}
      <div 
        className="w-full border border-[#C5A880]/50 bg-card p-6 text-center rounded-md relative group hover:border-[#C5A880] transition-colors shadow-sm"
      >
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-card px-3 text-[9px] uppercase tracking-[0.2em] text-[#C5A880] font-semibold whitespace-nowrap border border-border/60 rounded-full">
          Base Notes
        </div>
        <span className="text-foreground text-xs font-medium">{safeBase.join(" • ") || "Lasting resonance"}</span>
      </div>
    </div>
  );
};
