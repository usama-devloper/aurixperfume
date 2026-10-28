import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus, Minus, Check } from "lucide-react";
import { Product } from "@/types";

interface ProductActionsProps {
  product: Product;
  quantity?: number;
  cartQuantity: number;
  isInCart?: boolean;
  isAdding: boolean;
  showAsAddedToCart: boolean;
  onAddToCart: () => void;
  onAddMoreToCart?: () => void;
  onIncreaseQuantity: () => void;
  onDecreaseQuantity: () => void;
}

const ProductActions = ({
  product,
  cartQuantity,
  isAdding,
  showAsAddedToCart,
  onAddToCart,
  onIncreaseQuantity,
  onDecreaseQuantity
}: ProductActionsProps) => {
  if (!showAsAddedToCart) {
    return (
      <Button 
        onClick={(e) => {
          e.preventDefault();
          onAddToCart();
        }}
        disabled={!product.inStock || isAdding}
        className={`w-full rounded-sm transition-all duration-300 font-sans font-medium tracking-[0.16em] text-[11px] uppercase h-9 sm:h-10 ${
          isAdding 
            ? 'bg-[#1C1917] text-[#FAF8F5] border border-[#C5A880]/50' 
            : product.inStock
              ? 'bg-[#C5A880] hover:bg-[#B8996F] text-[#1C1917] shadow-sm hover:shadow'
              : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
        }`}
      >
        {isAdding ? (
          <>
            <Check className="mr-1.5" size={13} />
            Added to Bag
          </>
        ) : (
          <>
            <ShoppingBag className="mr-1.5" size={13} />
            {product.inStock ? "Add to Bag" : "Sold Out"}
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Link to="/cart" className="w-full">
        <Button 
          variant="outline" 
          className="w-full rounded-sm border-border bg-background text-foreground hover:bg-[#C5A880] hover:text-[#1C1917] uppercase tracking-[0.16em] text-[10px] font-sans font-medium h-8 transition-colors"
        >
          View Bag
        </Button>
      </Link>
      <div className="flex items-center bg-muted/40 border border-border rounded-sm h-8 text-foreground overflow-hidden">
        <button 
          onClick={(e) => {
            e.preventDefault();
            onDecreaseQuantity();
          }}
          className="w-8 h-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center border-r border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880]" 
          aria-label={`Decrease quantity of ${product.name}`}
        >
          <Minus size={12} />
        </button>
        <span className="flex-1 text-center text-[10px] uppercase tracking-wider font-medium text-foreground">
          {cartQuantity} in Bag
        </span>
        <button 
          onClick={(e) => {
            e.preventDefault();
            onIncreaseQuantity();
          }}
          className="w-8 h-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center border-l border-border disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880]"
          disabled={cartQuantity >= 10}
          aria-label={`Increase quantity of ${product.name}`}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
};

export default ProductActions;
