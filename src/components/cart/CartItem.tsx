import { useState } from "react";
import { Link } from "react-router-dom";
import { CartItem as CartItemType } from "@/types";
import { Trash2, Plus, Minus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Card } from "@/components/ui/card";

interface CartItemProps {
  item: CartItemType;
}

const CartItem = ({ item }: CartItemProps) => {
  const { product, quantity } = item;
  const { updateQuantity, removeItem } = useCart();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleQuantityChange = (newQuantity: number) => {
    setIsUpdating(true);
    if (newQuantity <= 0) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, newQuantity);
    }
    setTimeout(() => setIsUpdating(false), 200);
  };

  const totalPrice = product.price * quantity;

  return (
    <Card className="mb-3 sm:mb-4 overflow-hidden shadow-sm border border-border bg-card rounded-lg transition-shadow duration-200">
      <div className="flex items-center sm:items-start p-3 sm:p-4 gap-3 sm:gap-4">
        {/* Product Image */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted/30 border border-border/60">
          <Link to={`/products/${product.id}`}>
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
            />
          </Link>
        </div>
        
        {/* Product Details & Controls */}
        <div className="flex-grow min-w-0 flex flex-col justify-between gap-2 self-stretch">
          {/* Top Row: Title, Brand, Size & Direct Remove */}
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block truncate">
                {product.brand}
              </span>
              <Link to={`/products/${product.id}`} className="group block">
                <h3 className="font-serif font-semibold text-sm sm:text-base text-foreground group-hover:text-[#C5A880] transition-colors truncate">
                  {product.name}
                </h3>
              </Link>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {product.size.value}{product.size.unit}
              </p>
            </div>
            
            {/* Direct Remove / Trash Button */}
            <button 
              onClick={() => removeItem(product.id)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive/60"
              aria-label={`Remove ${product.name} from cart`}
              title={`Remove ${product.name} from cart`}
            >
              <Trash2 size={15} />
            </button>
          </div>
          
          {/* Bottom Row: Quantity Stepper & Price Breakdown */}
          <div className="flex justify-between items-end gap-2 pt-1 border-t border-border/50">
            {/* Quantity Stepper */}
            <div className="flex items-center">
              <div className="flex items-center border border-border bg-muted/40 h-7 sm:h-8 text-foreground rounded-md overflow-hidden">
                <button 
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="px-2 sm:px-2.5 h-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors flex items-center justify-center border-r border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880]"
                  disabled={isUpdating}
                  aria-label={`Decrease quantity of ${product.name}`}
                >
                  <Minus size={11} />
                </button>
                <span className="px-2.5 sm:px-3 min-w-[1.75rem] sm:min-w-[2rem] text-center text-xs font-semibold">
                  {quantity}
                </span>
                <button 
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="px-2 sm:px-2.5 h-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors flex items-center justify-center border-l border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880]"
                  disabled={isUpdating || quantity >= 10}
                  aria-label={`Increase quantity of ${product.name}`}
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>
            
            {/* Price breakdown */}
            <div className="text-right">
              <div className="font-semibold text-sm sm:text-base text-foreground leading-tight">
                ₹{totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {quantity > 1 && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  ₹{product.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CartItem;
