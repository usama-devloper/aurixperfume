import { Plus, Minus } from "lucide-react";

interface ProductQuantityControlsProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  canDecrease?: boolean;
  canIncrease?: boolean;
  productName?: string;
}

const ProductQuantityControls = ({ 
  quantity, 
  onIncrease, 
  onDecrease, 
  canDecrease = true, 
  canIncrease = true,
  productName
}: ProductQuantityControlsProps) => {
  return (
    <div className="flex items-center bg-muted/40 border border-border rounded-md h-8 text-foreground overflow-hidden">
      <button 
        onClick={(e) => {
          e.preventDefault();
          onDecrease();
        }}
        className="w-8 h-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors flex items-center justify-center border-r border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880]" 
        disabled={!canDecrease}
        aria-label={productName ? `Decrease quantity of ${productName}` : "Decrease quantity"}
      >
        <Minus size={12} />
      </button>
      <span className="w-9 text-center text-xs font-semibold">{quantity}</span>
      <button 
        onClick={(e) => {
          e.preventDefault();
          onIncrease();
        }}
        className="w-8 h-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors flex items-center justify-center border-l border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880]"
        disabled={!canIncrease}
        aria-label={productName ? `Increase quantity of ${productName}` : "Increase quantity"}
      >
        <Plus size={12} />
      </button>
    </div>
  );
};

export default ProductQuantityControls;
