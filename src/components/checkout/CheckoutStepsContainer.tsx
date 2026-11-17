import { useState, useEffect } from "react";
import CheckoutSteps from "./CheckoutSteps";
import ShippingAddressForm, { ShippingFormValues } from "./ShippingAddressForm";
import PaymentForm from "./PaymentForm";
import OrderReview from "./OrderReview";
import CheckoutSummary from "./CheckoutSummary";
import { CartItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { useShippingAddresses, ShippingAddress } from "@/hooks/useShippingAddresses";
import { useOrders } from "@/hooks/useOrders";
import { useSavedPaymentMethod } from "@/hooks/useSavedPaymentMethod";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import { supabase } from "@/integrations/supabase/client";

type CheckoutStep = "shipping" | "payment" | "review";

interface CheckoutStepsContainerProps {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  clearCart: () => void;
}

const CheckoutStepsContainer = ({ items, totalItems, totalAmount, clearCart }: CheckoutStepsContainerProps) => {
  const { shipping, tax, orderTotal } = usePricingSettings(totalAmount);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addresses, getDefaultAddress, addAddress } = useShippingAddresses();
  const { placeOrder } = useOrders();
  const { paymentInfo, setPaymentInfo } = useSavedPaymentMethod();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>("shipping");
  const [submitting, setSubmitting] = useState(false);

  const [shippingInfo, setShippingInfo] = useState<ShippingFormValues>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "India",
    addressType: "home" as const
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);

  useEffect(() => {
    if (!user && items.length > 0) {
      toast({
        title: "Login Required",
        description: "Please login to continue with checkout",
      });
      navigate("/auth?redirect=/checkout");
    }

    if (items.length === 0) {
      navigate("/cart");
    }

    const defaultAddress = getDefaultAddress();
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
      setShippingInfo({
        fullName: defaultAddress.full_name,
        email: defaultAddress.email || user?.email || "",
        phone: defaultAddress.phone || "",
        address: defaultAddress.address,
        city: defaultAddress.city,
        state: defaultAddress.state,
        zip: defaultAddress.zip,
        country: defaultAddress.country
      });
    }
  }, [user, items, addresses]);

  const handleShippingSubmit = (shippingData: ShippingFormValues, shouldSave?: boolean) => {
    setShippingInfo(shippingData);
    if (shouldSave !== undefined) {
      setSaveAddress(shouldSave);
    }
    setCurrentStep("payment");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep("review");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddressSelect = (address: ShippingAddress) => {
    setSelectedAddressId(address.id);
    setShippingInfo({
      fullName: address.full_name,
      email: address.email || user?.email || "",
      phone: address.phone || "",
      address: address.address,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country
    });
  };

  const ensureAddressId = async (): Promise<string | null> => {
    let addressId = selectedAddressId === "new" ? null : selectedAddressId;
    
    if (!addressId && saveAddress) {
      try {
        const addressData = await addAddress({
          full_name: shippingInfo.fullName,
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zip: shippingInfo.zip,
          country: shippingInfo.country,
          phone: shippingInfo.phone || null,
          email: shippingInfo.email || null,
          is_default: addresses.length === 0,
          address_type: shippingInfo.addressType || "home"
        });
        addressId = addressData.id;
      } catch (error) {
        console.error("Failed to save address:", error);
      }
    }

    // If still no address, create a temporary unsaved one so the order has shipping info
    if (!addressId) {
      try {
        const addressData = await addAddress({
          full_name: shippingInfo.fullName,
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zip: shippingInfo.zip,
          country: shippingInfo.country,
          phone: shippingInfo.phone || null,
          email: shippingInfo.email || null,
          is_default: addresses.length === 0,
          address_type: shippingInfo.addressType || "home"
        });
        addressId = addressData.id;
      } catch (error) {
        console.error("Failed to create address:", error);
      }
    }

    return addressId;
  };

  const handleOrderSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!user) {
        navigate("/auth?redirect=/checkout");
        return;
      }

      const addressId = await ensureAddressId();
      if (!addressId) {
        toast({
          title: "Address Required",
          description: "We couldn't save your shipping address. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const method = paymentInfo.paymentMethod;

      // CARD: create order first (so we have an ID), then redirect to Stripe Checkout
      if (method === "card") {
        const order = await placeOrder(items, orderTotal, addressId, {
          payment_method: "card",
          payment_status: "unpaid",
        });

        const { data, error } = await supabase.functions.invoke(
          "create-checkout-session",
          {
            body: {
              orderId: order.id,
              items: items.map((it) => ({
                name: it.product.name,
                image: it.product.image,
                unit_price: it.product.price,
                quantity: it.quantity,
              })),
              shipping,
              tax,
            },
          }
        );

        if (error || !data?.url) {
          throw new Error(error?.message || "Could not start payment");
        }

        clearCart();
        window.location.href = data.url;
        return;
      }

      // RAZORPAY: Placeholder for future implementation
      if (method === "razorpay") {
        const order = await placeOrder(items, orderTotal, addressId, {
          payment_method: "card", // Save as card or create a new razorpay method enum in backend
          payment_status: "unpaid",
        });
        clearCart();
        toast({
          title: "Order Placed",
          description: `Order #${order.order_number} placed. Razorpay integration coming soon!`,
        });
        navigate("/order-confirmation", {
          state: { orderId: order.order_number, paymentMethod: "razorpay", paymentStatus: "unpaid" },
        });
        return;
      }

      // UPI: place order with UTR, mark as unpaid pending verification
      if (method === "upi") {
        const order = await placeOrder(items, orderTotal, addressId, {
          payment_method: "upi",
          payment_status: "unpaid",
          upi_utr: paymentInfo.upiUtr || null,
        });
        clearCart();
        toast({
          title: "Order Received",
          description: `Order #${order.order_number} placed. We'll confirm once your UPI payment is verified.`,
        });
        navigate("/order-confirmation", {
          state: { orderId: order.order_number, paymentMethod: "upi", paymentStatus: "unpaid" },
        });
        return;
      }

      // COD
      if (method === "cod") {
        const order = await placeOrder(items, orderTotal, addressId, {
          payment_method: "cod",
          payment_status: "cod_pending",
        });
        clearCart();
        toast({
          title: "Order Placed",
          description: `Order #${order.order_number} placed. Pay on delivery.`,
        });
        navigate("/order-confirmation", {
          state: { orderId: order.order_number, paymentMethod: "cod", paymentStatus: "cod_pending" },
        });
        return;
      }

      // MANUAL: contact admin via WhatsApp
      if (method === "manual") {
        const order = await placeOrder(items, orderTotal, addressId, {
          payment_method: "manual",
          payment_status: "awaiting_contact",
        });
        clearCart();
        toast({
          title: "Order Placed",
          description: `Order #${order.order_number} placed. Message admin on WhatsApp to complete payment.`,
        });
        navigate("/order-confirmation", {
          state: {
            orderId: order.order_number,
            paymentMethod: "manual",
            paymentStatus: "awaiting_contact",
            totalAmount: orderTotal,
          },
        });
        return;
      }
    } catch (error: any) {
      console.error("Failed to place order:", error);
      toast({
        title: "Order Failed",
        description: error?.message || "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "shipping":
        return (
          <ShippingAddressForm 
            onSubmit={handleShippingSubmit} 
            initialValues={shippingInfo}
            selectedAddressId={selectedAddressId}
            onAddressSelect={(id) => setSelectedAddressId(id)}
          />
        );
      case "payment":
        return (
          <PaymentForm
            onSubmit={handlePaymentSubmit}
            onBack={() => setCurrentStep("shipping")}
            paymentInfo={paymentInfo}
            setPaymentInfo={setPaymentInfo}
            totalAmount={orderTotal}
          />
        );
      case "review":
        return (
          <OrderReview
            shippingInfo={shippingInfo}
            paymentInfo={paymentInfo}
            items={items}
            onBack={() => setCurrentStep("payment")}
            onSubmit={handleOrderSubmit}
            savedAddresses={addresses}
            onAddressSelect={handleAddressSelect}
            saveAddress={saveAddress}
            onSaveAddressChange={setSaveAddress}
            selectedAddressId={selectedAddressId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10 max-w-7xl">
      <div className="mb-8 text-center">
        <span className="text-[11px] font-semibold tracking-[0.25em] text-[#C5A880] uppercase block mb-1">
          Bespoke Dispatch
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-medium text-foreground tracking-tight">Checkout</h1>
      </div>
      <CheckoutSteps currentStep={currentStep} onStepClick={setCurrentStep} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">{renderStepContent()}</div>
        <div className="lg:col-span-1">
          <CheckoutSummary items={items} totalAmount={totalAmount} />
        </div>
      </div>
    </div>
  );
};

export default CheckoutStepsContainer;
