
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

export interface ShippingAddress {
  id: string;
  user_id: string;
  full_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  address_type?: string | null;
  phone: string | null;
  email: string | null;
  is_default: boolean;
  created_at: string;
}

export const useShippingAddresses = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAddresses();
    } else {
      setAddresses([]);
      setLoading(false);
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shipping_addresses")
        .select("*")
        .eq("user_id", user?.id)
        .order("is_default", { ascending: false });

      if (error) throw error;
      
      const parsedData = (data || []).map(addr => {
        let type = "home";
        let name = addr.full_name || "";
        
        if (name.startsWith("[home] ")) {
          type = "home";
          name = name.substring(7);
        } else if (name.startsWith("[office] ")) {
          type = "office";
          name = name.substring(9);
        } else if (name.startsWith("[other] ")) {
          type = "other";
          name = name.substring(8);
        }
        
        return {
          ...addr,
          full_name: name,
          address_type: type
        } as ShippingAddress;
      });

      setAddresses(parsedData);
    } catch (error: any) {
      console.error("Error fetching shipping addresses:", error.message);
      toast({
        title: "Error",
        description: "Failed to load shipping addresses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addAddress = async (addressData: Omit<ShippingAddress, "id" | "user_id" | "created_at">) => {
    try {
      if (!user) throw new Error("User not authenticated");

      const { address_type, full_name, ...restData } = addressData;
      const typePrefix = address_type ? `[${address_type}] ` : "[home] ";
      const dbFullName = `${typePrefix}${full_name}`;

      const { data, error } = await supabase
        .from("shipping_addresses")
        .insert([{ ...restData, full_name: dbFullName, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      if (addressData.is_default) {
        // Update other addresses to not be default
        await updateDefaultStatus(data.id);
      }
      
      const returnedData = {
        ...data,
        full_name: full_name,
        address_type: address_type || "home"
      } as ShippingAddress;
      
      setAddresses(prev => [...prev, returnedData]);
      toast({
        title: "Success",
        description: "Shipping address added",
      });
      
      return data;
    } catch (error: any) {
      console.error("Error adding shipping address:", error.message);
      toast({
        title: "Error",
        description: "Failed to add shipping address",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateAddress = async (id: string, addressData: Partial<ShippingAddress>) => {
    try {
      if (!user) throw new Error("User not authenticated");
      
      const { address_type, full_name, ...restData } = addressData;
      const updatePayload: any = { ...restData };
      
      if (full_name !== undefined || address_type !== undefined) {
        // Find existing to get the current values if one is missing
        const existing = addresses.find(a => a.id === id);
        const nameToUse = full_name !== undefined ? full_name : (existing?.full_name || "");
        const typeToUse = address_type !== undefined ? address_type : (existing?.address_type || "home");
        
        updatePayload.full_name = `[${typeToUse}] ${nameToUse}`;
      }

      const { data, error } = await supabase
        .from("shipping_addresses")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", user.id) // Ensure user can only update their own addresses
        .select()
        .single();

      if (error) throw error;

      if (addressData.is_default) {
        // Update other addresses to not be default
        await updateDefaultStatus(id);
      }
      
      const returnedData = {
        ...data,
        full_name: full_name !== undefined ? full_name : (data.full_name.replace(/^\[.*?\]\s/, "")),
        address_type: address_type !== undefined ? address_type : (addresses.find(a => a.id === id)?.address_type || "home")
      } as ShippingAddress;
      
      setAddresses(prev => prev.map(address => address.id === id ? returnedData : address));
      toast({
        title: "Success",
        description: "Shipping address updated",
      });
    } catch (error: any) {
      console.error("Error updating shipping address:", error.message);
      toast({
        title: "Error",
        description: "Failed to update shipping address",
        variant: "destructive",
      });
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("shipping_addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // Ensure user can only delete their own addresses

      if (error) throw error;
      
      setAddresses(prev => prev.filter(address => address.id !== id));
      toast({
        title: "Success",
        description: "Shipping address deleted",
      });
    } catch (error: any) {
      console.error("Error deleting shipping address:", error.message);
      toast({
        title: "Error",
        description: "Failed to delete shipping address",
        variant: "destructive",
      });
    }
  };

  const updateDefaultStatus = async (defaultId: string) => {
    try {
      if (!user) throw new Error("User not authenticated");
      
      // Set all other addresses to not default
      const { error } = await supabase
        .from("shipping_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id) // Only update user's own addresses
        .neq("id", defaultId);

      if (error) throw error;
      
      // Update local state
      setAddresses(prev => 
        prev.map(address => ({
          ...address,
          is_default: address.id === defaultId
        }))
      );
    } catch (error: any) {
      console.error("Error updating default status:", error.message);
    }
  };

  const getDefaultAddress = (): ShippingAddress | undefined => {
    return addresses.find(address => address.is_default);
  };

  return {
    addresses,
    loading,
    addAddress,
    updateAddress,
    deleteAddress,
    updateDefaultStatus,
    getDefaultAddress,
    fetchAddresses,
  };
};
