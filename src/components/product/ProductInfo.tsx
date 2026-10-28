import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Product } from "@/types";

interface ProductInfoProps {
  product: Product;
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  const formulation = useMemo(() => {
    const parts: string[] = [];
    if (product.category) {
      parts.push(product.category.toUpperCase());
    }
    if (product.size?.value && product.size?.unit) {
      parts.push(`${product.size.value}${product.size.unit.toUpperCase()}`);
    }
    return parts.join(" • ");
  }, [product.category, product.size]);

  const olfactoryPreview = useMemo(() => {
    if (!product.fragrance) return null;
    const { topNotes = [], middleNotes = [], baseNotes = [] } = product.fragrance;
    const notes = [topNotes[0], middleNotes[0], baseNotes[0]].filter(Boolean);
    if (notes.length > 0) return notes.join(" • ");
    const fallback = [...topNotes, ...middleNotes, ...baseNotes].slice(0, 3);
    return fallback.length > 0 ? fallback.join(" • ") : null;
  }, [product.fragrance]);

  const formattedPrice = useMemo(() => {
    if (typeof product.price !== 'number') return '';
    return product.price % 1 === 0
      ? product.price.toLocaleString("en-IN")
      : product.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [product.price]);

  return (
    <div className="flex flex-col flex-grow">
      {/* Formulation / Category Eyebrow */}
      {formulation && (
        <span className="text-[10px] font-sans font-medium tracking-[0.2em] uppercase text-[#C5A880] truncate">
          {formulation}
        </span>
      )}

      {/* Product Name (allows 2 lines for long names on desktop, 1 line on compact mobile) */}
      <Link to={`/products/${product.id}`} className="group/title block mt-1">
        <h3 className="font-serif text-sm sm:text-base font-semibold text-foreground group-hover/title:text-[#C5A880] transition-colors line-clamp-1 sm:line-clamp-2 leading-snug">
          {product.name}
        </h3>
      </Link>

      {/* Olfactory Notes Preview (visible on tablet/desktop, cleanly hidden on 2-col compact mobile to maintain uniform card height) */}
      {olfactoryPreview && (
        <p className="hidden sm:block text-[11px] text-muted-foreground/80 font-light tracking-wide line-clamp-1 mt-1.5" title={olfactoryPreview}>
          {olfactoryPreview}
        </p>
      )}

      {/* Rating & Price Row */}
      <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-border/50 flex items-center justify-between gap-1.5 sm:gap-2">
        {product.rating > 0 ? (
          <div className="flex items-center text-xs text-[#C5A880]" aria-label={`${product.rating} out of 5 stars`}>
            <span className="tracking-tight text-[10px] sm:text-[11px]">
              {"★".repeat(Math.max(0, Math.min(5, Math.floor(product.rating || 5))))}
              {"☆".repeat(Math.max(0, 5 - Math.min(5, Math.floor(product.rating || 5))))}
            </span>
            <span className="ml-0.5 sm:ml-1 text-[9px] sm:text-[10px] text-muted-foreground font-sans">({product.reviews || 0})</span>
          </div>
        ) : (
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-sans">Maison Aurix</span>
        )}

        <span className="font-serif font-semibold text-xs sm:text-base text-foreground tracking-tight whitespace-nowrap">
          ₹{formattedPrice}
        </span>
      </div>
    </div>
  );
};

export default ProductInfo;
