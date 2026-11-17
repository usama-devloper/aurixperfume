import { CartItem } from "@/types";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import { ShieldCheck } from "lucide-react";

interface OrderSummaryProps {
  items: CartItem[];
  totalAmount: number;
}

const OrderSummary = ({ items, totalAmount }: OrderSummaryProps) => {
  const { shipping, tax, orderTotal } = usePricingSettings(totalAmount);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-card rounded-lg shadow-sm p-6 sticky top-24 border border-border text-foreground">
      <h2 className="font-serif text-lg font-semibold mb-6 border-b border-border/80 pb-3">Order Summary</h2>

      {/* List of items in cart */}
      <div className="max-h-80 overflow-y-auto mb-6 pr-1 space-y-3 custom-scrollbar">
        {items.map((item) => (
          <div key={item.product.id} className="flex py-2 border-b border-border/60 last:border-0 gap-3">
            <div className="w-14 h-14 flex-shrink-0 rounded-md overflow-hidden bg-muted/40 border border-border/60">
              <img 
                src={item.product.image} 
                alt={item.product.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-xs font-semibold text-foreground truncate" title={item.product.name}>
                {item.product.name}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
              <div className="flex justify-end mt-1">
                <span className="text-xs font-semibold text-foreground">
                  ₹{(item.product.price * item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="space-y-2.5 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal ({totalItems} items)</span>
          <span className="font-semibold text-foreground">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping</span>
          <span className={shipping === 0 ? "text-[#C5A880] font-semibold" : "font-semibold text-foreground"}>
            {shipping === 0 ? "Complimentary" : `₹${shipping.toFixed(2)}`}
          </span>
        </div>
        
        <div className="flex justify-between text-muted-foreground">
          <span>Estimated Tax (8%)</span>
          <span className="font-semibold text-foreground">₹{tax.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border/80">
        <div className="flex justify-between items-baseline mb-1">
          <span className="font-serif text-base font-semibold text-foreground">Grand Total</span>
          <span className="text-xl font-bold text-foreground">
            ₹{orderTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground text-right mt-1">Includes all courier and tax duties</p>

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck size={14} className="text-[#C5A880]" />
          <span>Verified Secure Transaction</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
