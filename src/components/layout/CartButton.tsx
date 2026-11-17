import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export const CartButton = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [animateCount, setAnimateCount] = useState(false);

  // Animate the cart count when it changes
  useEffect(() => {
    if (totalItems > 0) {
      setAnimateCount(true);
      const timer = setTimeout(() => setAnimateCount(false), 300);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={() => navigate("/cart")} 
      className="relative shrink-0 flex items-center justify-center text-foreground hover:text-[#C5A880] hover:bg-[#EFECE6]/60 dark:hover:bg-[#1B1918] transition-colors h-10 w-10 rounded-full"
      aria-label={`Shopping Bag (${totalItems} items)`}
    >
      <ShoppingBag className="h-[18px] w-[18px]" />
      {totalItems > 0 && (
        <span 
          className={`absolute -top-1 -right-1 bg-[#C5A880] text-[#1C1917] text-[10px] font-bold rounded-full w-4.5 h-4.5 min-w-[18px] px-1 flex items-center justify-center shadow-sm transition-transform duration-300 ${
            animateCount ? 'scale-125' : 'scale-100'
          }`}
        >
          {totalItems}
        </span>
      )}
    </Button>
  );
};
