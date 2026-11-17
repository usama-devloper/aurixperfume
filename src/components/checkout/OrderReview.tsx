import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CartItem } from "@/types";
import { CreditCard, MapPin, Smartphone, ShoppingBag, ArrowLeft, ShieldCheck } from "lucide-react";
import { type ShippingFormValues } from "./ShippingAddressForm";
import { PaymentInfo } from "./PaymentForm";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ShippingAddress } from "@/hooks/useShippingAddresses";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface OrderReviewProps {
  shippingInfo: ShippingFormValues;
  paymentInfo: PaymentInfo;
  items: CartItem[];
  onBack: () => void;
  onSubmit: () => void;
  savedAddresses?: ShippingAddress[];
  onAddressSelect?: (address: ShippingAddress) => void;
  saveAddress?: boolean;
  onSaveAddressChange?: (save: boolean) => void;
  selectedAddressId?: string | null;
}

const OrderReview = ({ 
  shippingInfo, 
  paymentInfo, 
  items, 
  onBack, 
  onSubmit,
  savedAddresses = [],
  onAddressSelect,
  saveAddress = false,
  onSaveAddressChange,
  selectedAddressId = null
}: OrderReviewProps) => {
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  const getPaymentMethodDisplay = () => {
    switch (paymentInfo.paymentMethod) {
      case 'card':
        return {
          icon: <CreditCard size={18} className="mr-2 text-[#C5A880]" />,
          title: 'Credit / Debit Card (Stripe)',
          details: 'Secure card redirection',
          subDetails: 'Encrypted via Stripe 256-bit SSL'
        };
      case 'upi':
        return {
          icon: <Smartphone size={18} className="mr-2 text-[#C5A880]" />,
          title: 'UPI Payment',
          details: paymentInfo.upiUtr ? `UTR: ${paymentInfo.upiUtr}` : 'Awaiting UPI verification',
          subDetails: null
        };
      case 'cod':
        return {
          icon: <ShoppingBag size={18} className="mr-2 text-[#C5A880]" />,
          title: 'Cash on Delivery',
          details: 'Pay upon delivery at your doorstep',
          subDetails: null
        };
      case 'manual':
        return {
          icon: <CreditCard size={18} className="mr-2 text-[#C5A880]" />,
          title: 'Direct WhatsApp Concierge',
          details: 'Personal settlement with administrator',
          subDetails: null
        };
      default:
        return {
          icon: <CreditCard size={18} className="mr-2 text-[#C5A880]" />,
          title: 'Payment Method',
          details: 'Selected method',
          subDetails: null
        };
    }
  };

  const paymentDisplay = getPaymentMethodDisplay();

  return (
    <div className="bg-card rounded-lg p-6 sm:p-8 shadow-sm border border-border space-y-8 text-foreground">
      <div className="border-b border-border/80 pb-3">
        <span className="text-[10px] font-semibold tracking-[0.25em] text-[#C5A880] uppercase block">
          Final Verification
        </span>
        <h2 className="font-serif text-xl sm:text-2xl font-medium">Review Your Order</h2>
      </div>
      
      {/* Shipping Address Section */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-foreground flex items-center">
            <MapPin size={16} className="mr-2 text-[#C5A880]" />
            Shipping Destination
          </h3>
          
          {savedAddresses.length > 0 && onAddressSelect && (
            <DropdownMenu open={showAddressDropdown} onOpenChange={setShowAddressDropdown}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted uppercase tracking-wider text-[11px] font-semibold h-8 px-3">
                  Change Address
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 bg-card border-border">
                {savedAddresses.map((address) => (
                  <DropdownMenuItem 
                    key={address.id}
                    className={`cursor-pointer ${address.id === selectedAddressId ? "bg-muted" : ""}`}
                    onClick={() => {
                      onAddressSelect(address);
                      setShowAddressDropdown(false);
                    }}
                  >
                    <div className="py-1">
                      <p className="font-semibold text-xs text-foreground">{address.full_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{address.address}, {address.city}, {address.state}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <Card className="overflow-hidden bg-muted/20 border-border rounded-lg shadow-none">
          <CardContent className="p-4 text-xs space-y-1">
            <p className="font-semibold text-sm text-foreground">{shippingInfo.fullName}</p>
            <p className="text-muted-foreground">{shippingInfo.address}</p>
            <p className="text-muted-foreground">
              {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}
            </p>
            <p className="text-muted-foreground">{shippingInfo.country}</p>
            <div className="pt-2 mt-2 border-t border-border/60 text-muted-foreground space-y-0.5">
              <p>Email: {shippingInfo.email}</p>
              <p>Phone: {shippingInfo.phone}</p>
            </div>
          </CardContent>
        </Card>
        
        {onSaveAddressChange && !selectedAddressId && (
          <div className="flex items-center space-x-2 mt-3">
            <Checkbox 
              id="save-address" 
              checked={saveAddress}
              onCheckedChange={(checked) => onSaveAddressChange(!!checked)} 
            />
            <label htmlFor="save-address" className="text-xs text-muted-foreground cursor-pointer">
              Save this address to your account for future orders
            </label>
          </div>
        )}
      </div>
      
      {/* Payment Method Section */}
      <div>
        <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-foreground mb-3 flex items-center">
          {paymentDisplay.icon}
          Selected Settlement
        </h3>
        <Card className="overflow-hidden bg-muted/20 border-border rounded-lg shadow-none">
          <CardContent className="p-4 text-xs">
            <p className="font-semibold text-sm text-foreground">{paymentDisplay.title}</p>
            {paymentDisplay.details && (
              <p className="text-muted-foreground mt-1">{paymentDisplay.details}</p>
            )}
            {paymentDisplay.subDetails && (
              <p className="text-muted-foreground mt-0.5">{paymentDisplay.subDetails}</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Order Items Section */}
      <div>
        <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-foreground mb-3">
          Ordered Creations ({items.length})
        </h3>
        <Card className="overflow-hidden bg-muted/20 border-border rounded-lg shadow-none">
          <CardContent className="p-4 divide-y divide-border/60">
            {items.map((item) => (
              <div key={item.product.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={item.product.image} 
                    alt={item.product.name} 
                    className="w-14 h-14 object-cover rounded-md border border-border/60 flex-shrink-0"
                  />
                  <div>
                    <p className="font-semibold text-xs text-foreground">{item.product.name}</p>
                    <p className="text-[11px] text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                </div>
                <p className="font-semibold text-xs text-foreground whitespace-nowrap">
                  ₹{(item.product.price * item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      
      {/* Action Buttons */}
      <div className="pt-4 flex flex-col sm:flex-row gap-3">
        <Button 
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full sm:w-1/3 rounded-md border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold h-12"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back
        </Button>
        <Button 
          type="button"
          onClick={onSubmit}
          className="w-full sm:w-2/3 btn-gold h-12 text-xs uppercase tracking-wider font-semibold shadow-sm"
        >
          Complete & Place Order
        </Button>
      </div>
    </div>
  );
};

export default OrderReview;
