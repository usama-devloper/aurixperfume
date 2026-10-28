import { useState } from "react";
import { Link } from "react-router-dom";
import { Product } from "@/types";
import { Sparkles } from "lucide-react";

interface ProductImageProps {
  product: Product;
}

const ProductImage = ({ product }: ProductImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link to={`/products/${product.id}`} className="aspect-[4/5] overflow-hidden relative block bg-[#F7F4EE] dark:bg-[#1B1918]">
      {!imageError ? (
        <div className="w-full h-full relative">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#F7F4EE] dark:bg-[#1B1918]">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C5A880]"></div>
            </div>
          )}
          <img 
            src={product.image} 
            alt={product.name} 
            className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
              imageLoaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0'
            }`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className="w-full h-full bg-[#FAF8F5] dark:bg-[#1B1918] flex items-center justify-center border-b border-border/60">
          <div className="text-center p-6 text-[#78716C]">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-[#C5A880]" />
            <div className="font-serif text-sm font-medium text-foreground">{product.name}</div>
            <div className="text-[10px] uppercase tracking-widest mt-1 text-muted-foreground">{product.category}</div>
          </div>
        </div>
      )}
      {/* Subtle Luxury Signature Badge */}
      {product.featured && product.inStock && (
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <span className="bg-[#0A0807]/75 backdrop-blur-md border border-[#C5A880]/40 text-[#C5A880] px-2.5 py-0.5 rounded-sm text-[9px] font-sans font-medium tracking-[0.2em] uppercase shadow-sm">
            SIGNATURE
          </span>
        </div>
      )}
      {!product.inStock && (
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center z-10">
          <span className="bg-[#0A0807]/90 border border-[#C5A880]/30 text-[#FAF8F5] px-3.5 py-1.5 rounded-sm text-[10px] font-sans font-medium tracking-[0.2em] uppercase shadow-md">
            Out of Stock
          </span>
        </div>
      )}
    </Link>
  );
};

export default ProductImage;
