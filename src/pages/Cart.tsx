import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import CartItem from "@/components/cart/CartItem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBag, ArrowLeft, Trash2, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { usePricingSettings } from "@/hooks/usePricingSettings";

const Cart = () => {
  const { items, totalItems, totalAmount, clearCart, lastRemovedItem, restoreItem } = useCart();
  const navigate = useNavigate();
  
  const { shipping, tax, orderTotal, shippingFee, freeShippingThreshold } = usePricingSettings(totalAmount);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/products");
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-6 text-muted-foreground">
          <ShoppingBag size={28} />
        </div>
        <h2 className="text-2xl font-serif mb-2 text-foreground">Your Shopping Bag is Empty</h2>
        <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
          Explore our signature collections and discover an exquisite fragrance to add to your personal ritual.
        </p>
        
        {lastRemovedItem && (
          <div className="mb-6 p-3.5 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-between gap-3 text-left">
            <span className="text-xs text-foreground">
              <strong>{lastRemovedItem.product.name}</strong> was removed.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => restoreItem(lastRemovedItem)}
              className="text-[#C5A880] border-[#C5A880]/50 hover:bg-[#C5A880] hover:text-[#1C1917] h-8 px-3 text-xs font-semibold uppercase tracking-wider shrink-0"
            >
              Undo
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/products")} className="btn-gold">
            Browse Fragrance Gallery
          </Button>
          <Button onClick={() => navigate("/")} variant="outline" className="rounded-md border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold">
            Return to Maison
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-6 sm:py-10 max-w-7xl">
      <div className="flex justify-between items-center mb-6 sm:mb-8 border-b border-border/80 pb-3 sm:pb-4">
        <div>
          <span className="text-[10px] sm:text-[11px] font-semibold tracking-[0.25em] text-[#C5A880] uppercase block">
            Checkout Preparation
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-medium text-foreground">
            Shopping Bag
          </h1>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleGoBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground tracking-wider uppercase font-semibold"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Continue Browsing</span>
          <span className="sm:hidden">Browse</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
        {/* Cart Items List */}
        <div className="lg:col-span-2">
          {lastRemovedItem && (
            <div className="mb-3.5 p-3 sm:p-3.5 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-between gap-3">
              <span className="text-xs text-foreground">
                <strong>{lastRemovedItem.product.name}</strong> was removed from your bag.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => restoreItem(lastRemovedItem)}
                className="text-[#C5A880] border-[#C5A880]/50 hover:bg-[#C5A880] hover:text-[#1C1917] h-7 sm:h-8 px-2.5 sm:px-3 text-xs font-semibold uppercase tracking-wider shrink-0"
              >
                Undo
              </Button>
            </div>
          )}

          <div className="mb-3 sm:mb-4 flex justify-between items-center">
            <h2 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-muted-foreground">
              Bag Items ({totalItems})
            </h2>
            <Button
              onClick={clearCart}
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 flex items-center gap-1 rounded-md text-xs font-medium h-7 sm:h-8"
              size="sm"
            >
              <Trash2 size={13} />
              Clear All
            </Button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {items.map((item) => (
              <CartItem key={item.product.id} item={item} />
            ))}
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24 shadow-sm bg-card border border-border rounded-lg">
            <h2 className="font-serif text-lg font-semibold mb-4 border-b border-border/80 pb-3 text-foreground">
              Order Summary
            </h2>

            {/* Free Shipping Progress Indicator */}
            <div className="mb-6 p-3 bg-muted/40 rounded-lg border border-border/60">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Truck size={14} className="text-[#C5A880] shrink-0" />
                  {totalAmount >= freeShippingThreshold ? (
                    <span className="text-[#C5A880] font-semibold">Complimentary Shipping Unlocked!</span>
                  ) : (
                    <span>Add <strong className="text-[#C5A880]">₹{(freeShippingThreshold - totalAmount).toFixed(2)}</strong> more for Free Shipping</span>
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {Math.min(100, Math.round((totalAmount / freeShippingThreshold) * 100))}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#C5A880] transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, (totalAmount / freeShippingThreshold) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-3.5 mb-6 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-semibold text-foreground">
                  ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Courier Delivery</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-[#C5A880] font-semibold flex items-center gap-1.5">
                      <span className="line-through text-muted-foreground font-normal">₹{shippingFee.toFixed(2)}</span>
                      Complimentary
                    </span>
                  ) : (
                    `₹${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Taxes (8%)</span>
                <span className="font-medium text-foreground">₹{tax.toFixed(2)}</span>
              </div>

              <div className="border-t border-border/80 pt-4 mt-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-serif text-base font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">
                    ₹{orderTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {shipping === 0 ? (
                  <p className="text-[11px] text-[#C5A880] font-medium mt-1">You qualify for complimentary courier delivery!</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Add ₹{(freeShippingThreshold - totalAmount).toFixed(2)} more to qualify for free shipping.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate("/checkout")}
                className="w-full bg-[#1C1917] hover:bg-[#2B2724] text-[#FAF8F5] rounded-md uppercase tracking-wider text-xs font-semibold py-6 shadow-sm"
                size="lg"
              >
                Proceed to Checkout →
              </Button>
              
              <div className="pt-2 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
                <ShieldCheck size={14} className="text-[#C5A880]" />
                <span>Encrypted checkout via Stripe & UPI</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Cart;
