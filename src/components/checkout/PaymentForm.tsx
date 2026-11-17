import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useSecurityLogger } from "@/hooks/useSecurityLogger";
import { useSiteSetting } from "@/hooks/useSiteSettings";
import { CreditCard, Smartphone, Lock, Banknote, MessageCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface PaymentFormProps {
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  paymentInfo: PaymentInfo;
  setPaymentInfo: React.Dispatch<React.SetStateAction<PaymentInfo>>;
  totalAmount: number;
}

export interface PaymentInfo {
  paymentMethod: 'card' | 'upi' | 'cod' | 'manual' | 'razorpay';
  cardName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  upiId?: string;
  upiUtr?: string;
  savePaymentMethod?: boolean;
}

const PaymentForm = ({ onSubmit, onBack, paymentInfo, setPaymentInfo, totalAmount }: PaymentFormProps) => {
  useAuth();
  const { logPaymentEvent } = useSecurityLogger();
  const merchantUpiId = useSiteSetting("merchant_upi_id") || "aurixperfume@upi";
  const adminWhatsapp = useSiteSetting("admin_whatsapp_number") || "+919876543210";
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [processingPayment, setProcessingPayment] = useState(false);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (paymentInfo.paymentMethod === 'upi') {
      if (!paymentInfo.upiUtr?.trim()) {
        errors.upiUtr = "UPI Transaction Reference (UTR) is required after payment";
      } else if (!/^[A-Za-z0-9]{8,30}$/.test(paymentInfo.upiUtr.trim())) {
        errors.upiUtr = "Enter a valid 8–30 character UTR number";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processingPayment) return;
    if (!validateForm()) return;

    setProcessingPayment(true);
    try {
      await logPaymentEvent('payment_initiated', undefined, {
        paymentMethod: paymentInfo.paymentMethod,
        timestamp: new Date().toISOString(),
      });
      await onSubmit(e);
    } catch (error: any) {
      await logPaymentEvent('payment_failed', undefined, {
        paymentMethod: paymentInfo.paymentMethod,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentMethodChange = (method: PaymentInfo['paymentMethod']) => {
    setPaymentInfo({
      ...paymentInfo,
      paymentMethod: method,
      cardName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      upiId: '',
      upiUtr: '',
    });
    setFormErrors({});
  };

  const ctaLabel = () => {
    if (processingPayment) return 'Securing Order...';
    if (paymentInfo.paymentMethod === 'card') return `Pay ₹${totalAmount.toFixed(2)} with Stripe`;
    if (paymentInfo.paymentMethod === 'razorpay') return `Pay ₹${totalAmount.toFixed(2)} with Razorpay`;
    if (paymentInfo.paymentMethod === 'upi') return `Confirm UPI Payment`;
    if (paymentInfo.paymentMethod === 'manual') return `Place Order & WhatsApp Admin`;
    return `Place Cash on Delivery Order`;
  };

  return (
    <div className="bg-card rounded-lg p-6 sm:p-8 shadow-sm border border-border text-foreground">
      <div className="mb-6 border-b border-border/80 pb-3">
        <span className="text-[10px] font-semibold tracking-[0.25em] text-[#C5A880] uppercase block">
          Secure Settlement
        </span>
        <h2 className="font-serif text-xl sm:text-2xl font-medium">Select Payment Method</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
            Available Payment Gateways
          </label>
          <RadioGroup
            value={paymentInfo.paymentMethod}
            onValueChange={handlePaymentMethodChange}
            className="space-y-3"
          >
            {/* Card / Stripe */}
            <div className={`flex items-center space-x-3 p-4 border rounded-lg transition-all cursor-pointer ${
              paymentInfo.paymentMethod === 'card' 
                ? 'border-[#C5A880] bg-[#C5A880]/5 ring-1 ring-[#C5A880]/40' 
                : 'border-border hover:bg-muted/30'
            }`}>
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card" className="flex items-center cursor-pointer flex-1 gap-2">
                <CreditCard className="w-5 h-5 text-[#C5A880]" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">Credit / Debit Card · Apple Pay · Google Pay</span>
                  <span className="text-[11px] text-muted-foreground">Instant encrypted checkout powered by Stripe</span>
                </div>
              </Label>
            </div>

            {/* UPI */}
            <div className={`flex items-center space-x-3 p-4 border rounded-lg transition-all cursor-pointer ${
              paymentInfo.paymentMethod === 'upi' 
                ? 'border-[#C5A880] bg-[#C5A880]/5 ring-1 ring-[#C5A880]/40' 
                : 'border-border hover:bg-muted/30'
            }`}>
              <RadioGroupItem value="upi" id="upi" />
              <Label htmlFor="upi" className="flex items-center cursor-pointer flex-1 gap-2">
                <Smartphone className="w-5 h-5 text-[#C5A880]" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">UPI Transfer (Scan QR & Enter UTR)</span>
                  <span className="text-[11px] text-muted-foreground">Pay using Google Pay, PhonePe, or Paytm</span>
                </div>
              </Label>
            </div>

            {/* Cash on Delivery */}
            <div className={`flex items-center space-x-3 p-4 border rounded-lg transition-all cursor-pointer ${
              paymentInfo.paymentMethod === 'cod' 
                ? 'border-[#C5A880] bg-[#C5A880]/5 ring-1 ring-[#C5A880]/40' 
                : 'border-border hover:bg-muted/30'
            }`}>
              <RadioGroupItem value="cod" id="cod" />
              <Label htmlFor="cod" className="flex items-center cursor-pointer flex-1 gap-2">
                <Banknote className="w-5 h-5 text-[#C5A880]" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">Cash on Delivery</span>
                  <span className="text-[11px] text-muted-foreground">Pay upon hand-delivery of your fragrance</span>
                </div>
              </Label>
            </div>

            {/* WhatsApp Manual */}
            <div className={`flex items-center space-x-3 p-4 border rounded-lg transition-all cursor-pointer ${
              paymentInfo.paymentMethod === 'manual' 
                ? 'border-[#C5A880] bg-[#C5A880]/5 ring-1 ring-[#C5A880]/40' 
                : 'border-border hover:bg-muted/30'
            }`}>
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="flex items-start cursor-pointer flex-1 gap-2">
                <MessageCircle className="w-5 h-5 mt-0.5 text-[#C5A880] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">Direct Concierge Coordination (WhatsApp)</span>
                  <span className="text-[11px] text-muted-foreground">Coordinate custom bank transfer directly with our team</span>
                </div>
              </Label>
            </div>

            {/* Razorpay (Disabled placeholder) */}
            <div className="flex items-center space-x-3 p-3.5 border border-border/50 rounded-lg opacity-50 bg-muted/20">
              <RadioGroupItem value="razorpay" id="razorpay" disabled />
              <Label htmlFor="razorpay" className="flex items-center cursor-not-allowed flex-1 gap-2">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Razorpay Gateway (NetBanking, Cards)</span>
                  <span className="text-[10px] text-[#C5A880] font-medium">Under routine maintenance</span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Selected method details */}
        {paymentInfo.paymentMethod === 'card' && (
          <div className="space-y-4 p-5 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-[#C5A880]" />
              <div>
                <h3 className="font-serif font-semibold text-sm text-foreground">Direct 256-Bit Encrypted Checkout</h3>
                <p className="text-xs text-muted-foreground">You will be seamlessly transferred to Stripe's authorized payment portal.</p>
              </div>
            </div>
            <div className="p-4 rounded-md bg-card border border-border/80 text-xs text-muted-foreground leading-relaxed">
              Accepts Visa, MasterCard, American Express, Apple Pay, and Google Pay. Card details never touch our local database.
            </div>
          </div>
        )}

        {paymentInfo.paymentMethod === 'upi' && (
          <div className="space-y-5 p-5 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-[#C5A880]" />
              <div>
                <h3 className="font-serif font-semibold text-sm text-foreground">Scan QR & Authorize</h3>
                <p className="text-xs text-muted-foreground">Step 1: Scan via your preferred UPI application.</p>
              </div>
            </div>

            <div className="flex flex-col items-center bg-card rounded-lg p-5 border border-border max-w-xs mx-auto text-center shadow-sm">
              <div className="bg-white p-3 rounded-md border border-border mb-3">
                <QRCodeSVG
                  value={`upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=Aurix%20Perfume&am=${totalAmount.toFixed(2)}&cu=INR`}
                  size={160}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs font-semibold text-foreground">₹{totalAmount.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">UPI ID: {merchantUpiId}</p>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="upiUtr" className="block text-xs uppercase tracking-wider font-semibold text-foreground">
                Step 2: Enter Transaction UTR / Reference ID
              </Label>
              <Input
                id="upiUtr"
                value={paymentInfo.upiUtr || ''}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, upiUtr: e.target.value })}
                placeholder="12-digit UTR Number from your UPI receipt"
                className={`h-11 bg-card border-border ${formErrors.upiUtr ? 'border-destructive' : ''}`}
              />
              {formErrors.upiUtr && <p className="text-destructive text-xs mt-1">{formErrors.upiUtr}</p>}
              <p className="text-[11px] text-muted-foreground">
                Your order is reserved immediately and dispatched upon transaction verification.
              </p>
            </div>
          </div>
        )}

        {paymentInfo.paymentMethod === 'manual' && (
          <div className="space-y-3 p-5 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-[#C5A880]" />
              <div>
                <h3 className="font-serif font-semibold text-sm text-foreground">Personal Concierge Settlement</h3>
                <p className="text-xs text-muted-foreground">Coordinate directly with our founder on WhatsApp.</p>
              </div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 ml-4 list-disc">
              <li>Order Total: <strong className="text-foreground">₹{totalAmount.toFixed(2)}</strong></li>
              <li>Official Concierge: <strong className="text-foreground">{adminWhatsapp}</strong></li>
              <li>A direct chat link will be provided on the confirmation page.</li>
            </ul>
          </div>
        )}

        {paymentInfo.paymentMethod === 'cod' && (
          <div className="space-y-3 p-5 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <Banknote className="w-5 h-5 text-[#C5A880]" />
              <div>
                <h3 className="font-serif font-semibold text-sm text-foreground">Cash on Delivery Hand-Off</h3>
                <p className="text-xs text-muted-foreground">Pay with cash upon parcel arrival.</p>
              </div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 ml-4 list-disc">
              <li>Exact amount due upon delivery: <strong className="text-foreground">₹{totalAmount.toFixed(2)}</strong></li>
              <li>Available across major pin codes in India.</li>
            </ul>
          </div>
        )}

        <div className="flex justify-between items-center pt-6 border-t border-border/80 gap-4">
          <Button type="button" variant="outline" onClick={onBack} className="rounded-md border-border text-foreground hover:bg-muted text-xs font-semibold uppercase tracking-wider h-11 px-6">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back
          </Button>
          <Button 
            type="submit" 
            className="btn-gold h-11 px-8 text-xs uppercase tracking-wider font-semibold" 
            disabled={processingPayment}
          >
            {ctaLabel()}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
