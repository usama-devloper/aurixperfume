import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useSecurityLogger } from "@/hooks/useSecurityLogger";
import { useSiteSetting } from "@/hooks/useSiteSettings";
import { CreditCard, Smartphone, Lock, Banknote, MessageCircle } from "lucide-react";
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
    if (processingPayment) return 'Processing...';
    if (paymentInfo.paymentMethod === 'card') return `Pay ₹${totalAmount.toFixed(2)} securely`;
    if (paymentInfo.paymentMethod === 'razorpay') return `Pay ₹${totalAmount.toFixed(2)} with Razorpay`;
    if (paymentInfo.paymentMethod === 'upi') return `Confirm UPI Payment`;
    if (paymentInfo.paymentMethod === 'manual') return `Place Order & Contact Admin`;
    return `Place Order (Cash on Delivery)`;
  };

  return (
    <div className="bg-neutral-900 rounded-none p-6 shadow-none border border-neutral-800 text-white">
      <h2 className="text-xl font-medium mb-6">Payment Method</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-3">Choose Payment Method</label>
          <RadioGroup
            value={paymentInfo.paymentMethod}
            onValueChange={handlePaymentMethodChange}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2 p-3 border border-neutral-800 rounded-none hover:bg-neutral-800">
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card" className="flex items-center cursor-pointer flex-1">
                <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                <span>Credit / Debit Card · Apple Pay · Google Pay</span>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 border border-neutral-800 rounded-none opacity-60">
              <RadioGroupItem value="razorpay" id="razorpay" disabled />
              <Label htmlFor="razorpay" className="flex items-center cursor-not-allowed flex-1">
                <CreditCard className="w-5 h-5 mr-2 text-indigo-400" />
                <div className="flex flex-col">
                  <span className="text-gray-300">Razorpay (Cards, UPI, NetBanking)</span>
                  <span className="text-[11px] text-amber-500 font-medium">Currently Unavailable (Integration in progress)</span>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 border border-neutral-800 rounded-none hover:bg-neutral-800">
              <RadioGroupItem value="upi" id="upi" />
              <Label htmlFor="upi" className="flex items-center cursor-pointer flex-1">
                <Smartphone className="w-5 h-5 mr-2 text-orange-600" />
                <span>UPI (Scan QR & enter UTR)</span>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 border border-neutral-800 rounded-none hover:bg-neutral-800">
              <RadioGroupItem value="cod" id="cod" />
              <Label htmlFor="cod" className="flex items-center cursor-pointer flex-1">
                <Banknote className="w-5 h-5 mr-2 text-green-600" />
                <span>Cash on Delivery</span>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 border border-neutral-800 rounded-none hover:bg-neutral-800">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="flex items-start cursor-pointer flex-1">
                <MessageCircle className="w-5 h-5 mr-2 mt-0.5 text-emerald-600 shrink-0" />
                <div className="flex flex-col">
                  <span>Contact Admin to Pay (WhatsApp)</span>
                  <span className="text-xs text-muted-foreground">Best for testing — coordinate payment directly with us</span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {paymentInfo.paymentMethod === 'card' && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3 mb-2">
              <CreditCard className="w-8 h-8 text-blue-600" />
              <h3 className="font-medium text-base text-blue-800">Secure Card Payment</h3>
            </div>
            <div className="bg-neutral-900 rounded-none p-6 border border-blue-900 flex flex-col items-center justify-center min-h-[120px]">
              <Lock className="w-8 h-8 text-blue-400 mb-3" />
              <p className="text-sm text-blue-700 font-medium text-center">
                You'll be redirected to Stripe's secure checkout
              </p>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Pay with any major card, Apple Pay or Google Pay. Your card details never touch our servers.
              </p>
            </div>
          </div>
        )}

        {paymentInfo.paymentMethod === 'razorpay' && (
          <div className="space-y-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="flex items-center space-x-3 mb-2">
              <CreditCard className="w-8 h-8 text-indigo-600" />
              <h3 className="font-medium text-base text-indigo-800">Secure Payment via Razorpay</h3>
            </div>
            <div className="bg-neutral-900 rounded-none p-6 border border-indigo-900 flex flex-col items-center justify-center min-h-[120px]">
              <Lock className="w-8 h-8 text-indigo-400 mb-3" />
              <p className="text-sm text-indigo-700 font-medium text-center">
                (Future Implementation) You'll be redirected to Razorpay's secure checkout
              </p>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Pay with any major Card, UPI, or NetBanking.
              </p>
            </div>
          </div>
        )}

        {paymentInfo.paymentMethod === 'upi' && (
          <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center space-x-3 mb-2">
              <Smartphone className="w-8 h-8 text-orange-600" />
              <h3 className="font-medium text-base text-orange-800">UPI Payment</h3>
            </div>

            <div className="flex flex-col items-center bg-neutral-900 rounded-none p-4 border border-orange-900">
              <p className="text-sm text-center text-gray-400 mb-4">
                You will be redirected to complete your payment securely.
              </p>
              <div className="bg-neutral-800 p-3 rounded-none shadow-none border border-neutral-700">
                <QRCodeSVG
                  value={`upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=Aurix%20Perfume&am=${totalAmount.toFixed(2)}&cu=INR`}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Open any UPI app (GPay, PhonePe, Paytm) and scan
              </p>
            </div>

            <div>
              <Label htmlFor="upiUtr" className="block text-sm font-medium mb-2">
                Step 2: Enter UPI Transaction Reference (UTR)
              </Label>
              <Input
                id="upiUtr"
                value={paymentInfo.upiUtr || ''}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, upiUtr: e.target.value })}
                placeholder="e.g. 412345678901"
                className={formErrors.upiUtr ? 'border-destructive' : ''}
              />
              {formErrors.upiUtr && <p className="text-destructive text-sm mt-1">{formErrors.upiUtr}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Find the 12-digit UTR/Transaction ID in your UPI app after payment. Your order will be confirmed once we verify it (usually within a few hours).
              </p>
            </div>
          </div>
        )}

        {paymentInfo.paymentMethod === 'manual' && (
          <div className="space-y-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-8 h-8 text-emerald-600" />
              <h3 className="font-medium text-base text-emerald-800">Pay via WhatsApp</h3>
            </div>
            <p className="text-sm text-emerald-700">
              Place your order now without paying online. After placing the order, you'll get a button to message our admin on WhatsApp to arrange payment.
            </p>
            <ul className="text-xs text-emerald-700 space-y-1 ml-4 list-disc">
              <li>Order total: <strong>₹{totalAmount.toFixed(2)}</strong></li>
              <li>Admin WhatsApp: <strong>{adminWhatsapp}</strong></li>
              <li>Order will be confirmed once admin verifies your payment</li>
            </ul>
          </div>
        )}

        {paymentInfo.paymentMethod === 'cod' && (
          <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <Banknote className="w-8 h-8 text-green-600" />
              <h3 className="font-medium text-base text-green-800">Cash on Delivery</h3>
            </div>
            <p className="text-sm text-green-700">
              Pay in cash when your order is delivered. No advance payment required.
            </p>
            <ul className="text-xs text-green-700 space-y-1 ml-4 list-disc">
              <li>Total payable on delivery: <strong>₹{totalAmount.toFixed(2)}</strong></li>
              <li>Please have exact change ready</li>
              <li>Available for all serviceable pin codes</li>
            </ul>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            Back to Shipping
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={processingPayment}>
            {ctaLabel()}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
