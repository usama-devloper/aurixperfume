
import { useState } from "react";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { useShippingAddresses } from "@/hooks/useShippingAddresses";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import ShippingAddressSelector from "./shipping/ShippingAddressSelector";
import AddressForm from "./shipping/AddressForm";

// Define the form schema with Zod
export const formSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  address: z.string().min(5, { message: "Address is required." }),
  city: z.string().min(2, { message: "City is required." }),
  state: z.string().min(1, { message: "State is required." }),
  zip: z.string().min(4, { message: "ZIP/Postal code is required." }),
  country: z.string().min(1, { message: "Country is required." }),
  addressType: z.enum(["home", "office", "other"]).default("home"),
});

// Export the type so it can be used by other components
export type ShippingFormValues = z.infer<typeof formSchema>;

interface ShippingAddressFormProps {
  onSubmit: (shippingInfo: ShippingFormValues, saveAddress?: boolean) => void;
  initialValues?: ShippingFormValues;
  selectedAddressId?: string | null;
  onAddressSelect?: (addressId: string) => void;
}

const ShippingAddressForm = ({ onSubmit, initialValues, selectedAddressId: initialSelectedAddressId, onAddressSelect }: ShippingAddressFormProps) => {
  const { user } = useAuth();
  const { addresses } = useShippingAddresses();
  const [selectedAddressId, setSelectedAddressId] = useState<string>(initialSelectedAddressId || "");
  const [showNewAddressForm, setShowNewAddressForm] = useState(!initialSelectedAddressId || initialSelectedAddressId === "new");
  const [saveInfo, setSaveInfo] = useState(false);
  
  const defaultValues = initialValues || {
    fullName: "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "India",
    addressType: "home" as const,
  };
  
  const handleSavedAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId);
    if (onAddressSelect) {
      onAddressSelect(addressId);
    }
    setShowNewAddressForm(false);
    
    // If user selects "new address", show the form
    if (addressId === "new") {
      setShowNewAddressForm(true);
      return;
    }
    
    // Find the selected address from the list
    const selectedAddress = addresses.find(addr => addr.id === addressId);
    if (selectedAddress) {
      // Address form will be updated with the selected address data
      defaultValues.fullName = selectedAddress.full_name;
      defaultValues.email = selectedAddress.email || user?.email || "";
      defaultValues.phone = selectedAddress.phone || "";
      defaultValues.address = selectedAddress.address;
      defaultValues.city = selectedAddress.city;
      defaultValues.state = selectedAddress.state;
      defaultValues.zip = selectedAddress.zip;
      defaultValues.country = selectedAddress.country;
      defaultValues.addressType = selectedAddress.address_type as "home" | "office" | "other" || "home";
      
      // If address is selected, wait for the user to click Continue
    }
  };

  const handleFormSubmit = async (data: ShippingFormValues) => {
    onSubmit(data, saveInfo && showNewAddressForm);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg p-6 shadow-sm border border-border text-foreground">
        <h2 className="font-serif text-xl font-medium mb-6">Shipping Information</h2>
        
        {user && addresses.length > 0 && (
          <ShippingAddressSelector 
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onAddressSelect={handleSavedAddressSelect}
          />
        )}
        
        {(showNewAddressForm || addresses.length === 0 || !user) && (
          <AddressForm
            initialValues={defaultValues}
            onSubmit={handleFormSubmit}
            showSaveOption={!!user}
            saveInfo={saveInfo}
            setSaveInfo={setSaveInfo}
          />
        )}

        {/* Button to continue to payment when an address is selected but not auto-submitted */}
        {selectedAddressId && !showNewAddressForm && selectedAddressId !== "new" && (
          <div className="pt-6">
            <Button
              className="btn-primary w-full py-2 uppercase tracking-wider"
              onClick={() => {
                const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
                if (selectedAddress) {
                  handleFormSubmit({
                    fullName: selectedAddress.full_name,
                    email: selectedAddress.email || user?.email || "",
                    phone: selectedAddress.phone || "",
                    address: selectedAddress.address,
                    city: selectedAddress.city,
                    state: selectedAddress.state,
                    zip: selectedAddress.zip,
                    country: selectedAddress.country,
                    addressType: selectedAddress.address_type as "home" | "office" | "other" || "home"
                  });
                }
              }}
            >
              CONTINUE TO PAYMENT
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShippingAddressForm;
