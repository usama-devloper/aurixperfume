import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useShippingAddresses, ShippingAddress } from "@/hooks/useShippingAddresses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PackageCheck, MapPin, User, Shield, MapPinPlus, Trash2, Pencil, Heart } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import ProductCard from "@/components/product/ProductCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Profile = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mx-auto py-24 flex flex-col justify-center items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-perfume-gold" />
        <p className="text-xs uppercase tracking-widest text-neutral-400">Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/profile" replace />;
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-white">My Account</h1>
        <p className="text-gray-400 mt-2">Manage your profile, addresses, and orders.</p>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="mb-8 bg-neutral-900 border border-neutral-800 rounded-none p-0 h-auto">
          <TabsTrigger value="orders" className="data-[state=active]:bg-perfume-gold data-[state=active]:text-black text-gray-400 rounded-none px-6 py-3 font-bold uppercase tracking-widest text-[10px]">
            <PackageCheck className="w-4 h-4 mr-2" />
            My Orders
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-perfume-gold data-[state=active]:text-black text-gray-400 rounded-none px-6 py-3 font-bold uppercase tracking-widest text-[10px]">
            <User className="w-4 h-4 mr-2" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="addresses" className="data-[state=active]:bg-perfume-gold data-[state=active]:text-black text-gray-400 rounded-none px-6 py-3 font-bold uppercase tracking-widest text-[10px]">
            <MapPin className="w-4 h-4 mr-2" />
            Addresses
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="data-[state=active]:bg-perfume-gold data-[state=active]:text-black text-gray-400 rounded-none px-6 py-3 font-bold uppercase tracking-widest text-[10px]">
            <Heart className="w-4 h-4 mr-2" />
            Wishlist
          </TabsTrigger>
        </TabsList>

        {/* ORDERS TAB */}
        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        {/* ADDRESSES TAB */}
        <TabsContent value="addresses">
          <AddressesTab />
        </TabsContent>

        {/* WISHLIST TAB */}
        <TabsContent value="wishlist">
          <WishlistTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// --- Orders Tab Component ---
const OrdersTab = () => {
  const { orders, loading } = useOrders();

  return (
    <Card className="rounded-none border-neutral-800 bg-neutral-900 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl font-serif text-white">Order History</CardTitle>
        <CardDescription className="text-gray-400">Track and view all your past orders.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading your orders...</p>
        ) : orders.length > 0 ? (
          <div className="rounded-none border border-neutral-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-[#111111] border-b border-neutral-800">
                <TableRow className="border-neutral-800 hover:bg-[#111111]">
                  <TableHead className="w-[120px] text-gray-400">Order Number</TableHead>
                  <TableHead className="text-gray-400">Date</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-right text-gray-400">Total</TableHead>
                  <TableHead className="text-right text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="border-neutral-800 hover:bg-neutral-800/50">
                    <TableCell className="font-medium text-xs text-white">{order.order_number}</TableCell>
                    <TableCell className="text-sm text-gray-300">
                      {format(new Date(order.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-white">
                      ₹{order.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="rounded-none border-neutral-700 text-gray-300 hover:bg-neutral-800 hover:text-white uppercase tracking-widest text-[10px] font-bold" asChild>
                        <Link to={`/order-tracking?id=${order.id}`}>
                          Track Order
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed rounded-none border-neutral-800">
            <PackageCheck className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
            <p className="text-lg text-gray-400 mb-4">You haven't placed any orders yet.</p>
            <Button asChild className="rounded-none bg-perfume-gold text-black hover:bg-yellow-600 uppercase tracking-widest text-[10px] font-bold px-6">
              <Link to="/products">Discover Fragrances</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Profile Tab Component ---
const ProfileTab = () => {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
    }
  }, [profile]);

  const handleSave = async () => {
    updateProfile.mutate({
      first_name: firstName,
      last_name: lastName
    });
  };

  if (isLoading) return <p>Loading profile...</p>;

  return (
    <Card className="rounded-none border-neutral-800 bg-neutral-900 shadow-none max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl font-serif text-white">Personal Information</CardTitle>
        <CardDescription className="text-gray-400">Update your contact details and name.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-1.5 block text-gray-300">Email Address</label>
          <Input value={user?.email || ""} disabled className="bg-neutral-800 text-gray-400 rounded-none border-neutral-700" />
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Cannot be changed
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block text-gray-300">First Name</label>
            <Input 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)} 
              placeholder="First Name" 
              className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-gray-300">Last Name</label>
            <Input 
              value={lastName} 
              onChange={e => setLastName(e.target.value)} 
              placeholder="Last Name"
              className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" 
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSave} 
          disabled={updateProfile.isPending}
          className="rounded-none bg-perfume-gold text-black hover:bg-yellow-600 uppercase tracking-widest text-[10px] font-bold px-6 min-w-[120px]"
        >
          {updateProfile.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  );
};

// --- Addresses Tab Component ---
const AddressesTab = () => {
  const { addresses, loading: isLoading, addAddress, updateAddress, deleteAddress } = useShippingAddresses();
  const { user } = useAuth();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newAddress, setNewAddress] = useState<Omit<ShippingAddress, "id" | "user_id" | "created_at">>({
    full_name: user?.user_metadata?.full_name || "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "India",
    phone: "",
    email: user?.email || "",
    is_default: false,
    address_type: "home"
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAddressData, setEditAddressData] = useState<Partial<ShippingAddress> | null>(null);

  const startEditing = (addr: ShippingAddress) => {
    setEditingId(addr.id);
    setEditAddressData({
      full_name: addr.full_name,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      country: addr.country,
      phone: addr.phone || "",
      email: addr.email || "",
      is_default: addr.is_default,
      address_type: addr.address_type || "home"
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && editAddressData) {
      try {
        await updateAddress(editingId, editAddressData);
        setEditingId(null);
        setEditAddressData(null);
      } catch (error) {
        // error handled in hook
      }
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAddress(newAddress);
      setIsAdding(false);
      setNewAddress({
        full_name: user?.user_metadata?.full_name || "",
        address: "",
        city: "",
        state: "",
        zip: "",
        country: "India",
        phone: "",
        email: user?.email || "",
        is_default: false,
        address_type: "home"
      });
    } catch (error) {
      // error handled in hook
    }
  };

  if (isLoading) return <p>Loading addresses...</p>;

  return (
    <div className="space-y-6">
      {!isAdding && (
        <div className="flex justify-between items-center bg-[#111111] p-6 border border-neutral-800">
          <div>
            <h3 className="font-serif font-bold text-lg text-white">Saved Addresses</h3>
            <p className="text-sm text-gray-400">Manage your delivery locations.</p>
          </div>
          <Button onClick={() => setIsAdding(true)} className="rounded-none bg-perfume-gold text-black hover:bg-yellow-600 uppercase tracking-widest text-[10px] font-bold px-4">
            <MapPinPlus className="w-4 h-4 mr-2" /> Add New Address
          </Button>
        </div>
      )}

      {isAdding && (
        <Card className="rounded-none border-neutral-800 bg-neutral-900 shadow-none max-w-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-white">Add New Address</CardTitle>
          </CardHeader>
          <form onSubmit={handleAdd}>
            <CardContent className="space-y-4">
              <div className="space-y-3 mb-6">
                <label className="text-sm font-medium block text-gray-300">Save Address As</label>
                <RadioGroup
                  value={newAddress.address_type || "home"}
                  onValueChange={(val) => setNewAddress({...newAddress, address_type: val})}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="home" id="new-home" />
                    <label htmlFor="new-home" className="text-sm text-gray-300 cursor-pointer">Home</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="office" id="new-office" />
                    <label htmlFor="new-office" className="text-sm text-gray-300 cursor-pointer">Office</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="new-other" />
                    <label htmlFor="new-other" className="text-sm text-gray-300 cursor-pointer">Other</label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-gray-300">Full Name *</label>
                <Input required value={newAddress.full_name} onChange={e => setNewAddress({...newAddress, full_name: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="Rahul Sharma" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-gray-300">Phone *</label>
                  <Input required value={newAddress.phone || ""} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="+91 9876543210" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-gray-300">Email</label>
                  <Input type="email" value={newAddress.email || ""} onChange={e => setNewAddress({...newAddress, email: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="john@example.com" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-gray-300">Full Address *</label>
                <Input required value={newAddress.address} onChange={e => setNewAddress({...newAddress, address: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="123 MG Road, Bandra" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-gray-300">City *</label>
                  <Input required value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="Mumbai" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-gray-300">State *</label>
                  <Input required value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="Maharashtra" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-gray-300">PIN Code *</label>
                  <Input 
                    required 
                    value={newAddress.zip} 
                    onChange={async (e) => {
                      setNewAddress({...newAddress, zip: e.target.value});
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length === 6) {
                        try {
                          const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
                          const data = await res.json();
                          if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
                            const postOffice = data[0].PostOffice[0];
                            setNewAddress(prev => ({
                              ...prev,
                              zip: e.target.value,
                              city: postOffice.District,
                              state: postOffice.State,
                              country: "India"
                            }));
                          }
                        } catch (err) {
                          console.error("Failed to fetch pincode details:", err);
                        }
                      }
                    }} 
                    className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" 
                    placeholder="400001" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-gray-300">Country *</label>
                  <Input required value={newAddress.country} onChange={e => setNewAddress({...newAddress, country: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="India" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="gap-4 border-t border-neutral-800 pt-6 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)} className="rounded-none border-neutral-700 text-white hover:bg-neutral-800 hover:text-white uppercase tracking-widest text-[10px] font-bold">Cancel</Button>
              <Button type="submit" className="rounded-none bg-perfume-gold text-black hover:bg-yellow-600 uppercase tracking-widest text-[10px] font-bold px-6">
                Save Address
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {!isAdding && addresses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            editingId === addr.id && editAddressData ? (
              <Card key={`edit-${addr.id}`} className="rounded-none border-neutral-800 bg-neutral-900 shadow-none col-span-1 md:col-span-2 max-w-2xl">
                <CardHeader>
                  <CardTitle className="text-xl font-serif text-white">Edit Address</CardTitle>
                </CardHeader>
                <form onSubmit={handleEdit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 mb-6">
                      <label className="text-sm font-medium block text-gray-300">Save Address As</label>
                      <RadioGroup
                        value={editAddressData.address_type || "home"}
                        onValueChange={(val) => setEditAddressData({...editAddressData, address_type: val})}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="home" id={`edit-home-${addr.id}`} />
                          <label htmlFor={`edit-home-${addr.id}`} className="text-sm text-gray-300 cursor-pointer">Home</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="office" id={`edit-office-${addr.id}`} />
                          <label htmlFor={`edit-office-${addr.id}`} className="text-sm text-gray-300 cursor-pointer">Office</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="other" id={`edit-other-${addr.id}`} />
                          <label htmlFor={`edit-other-${addr.id}`} className="text-sm text-gray-300 cursor-pointer">Other</label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block text-gray-300">Full Name *</label>
                      <Input required value={editAddressData.full_name} onChange={e => setEditAddressData({...editAddressData, full_name: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="Rahul Sharma" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block text-gray-300">Phone *</label>
                        <Input required value={editAddressData.phone || ""} onChange={e => setEditAddressData({...editAddressData, phone: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="+91 9876543210" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block text-gray-300">Email</label>
                        <Input type="email" value={editAddressData.email || ""} onChange={e => setEditAddressData({...editAddressData, email: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="john@example.com" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block text-gray-300">Full Address *</label>
                      <Input required value={editAddressData.address} onChange={e => setEditAddressData({...editAddressData, address: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="123 MG Road, Bandra" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block text-gray-300">City *</label>
                        <Input required value={editAddressData.city} onChange={e => setEditAddressData({...editAddressData, city: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="Mumbai" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block text-gray-300">State *</label>
                        <Input required value={editAddressData.state} onChange={e => setEditAddressData({...editAddressData, state: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="Maharashtra" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block text-gray-300">PIN Code *</label>
                        <Input 
                          required 
                          value={editAddressData.zip} 
                          onChange={async (e) => {
                            setEditAddressData({...editAddressData, zip: e.target.value});
                            const val = e.target.value.replace(/\D/g, "");
                            if (val.length === 6) {
                              try {
                                const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
                                const data = await res.json();
                                if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
                                  const postOffice = data[0].PostOffice[0];
                                  setEditAddressData(prev => prev ? ({
                                    ...prev,
                                    zip: e.target.value,
                                    city: postOffice.District,
                                    state: postOffice.State,
                                    country: "India"
                                  }) : null);
                                }
                              } catch (err) {
                                console.error("Failed to fetch pincode details:", err);
                              }
                            }
                          }} 
                          className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" 
                          placeholder="400001" 
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block text-gray-300">Country *</label>
                        <Input required value={editAddressData.country} onChange={e => setEditAddressData({...editAddressData, country: e.target.value})} className="rounded-none bg-transparent border-neutral-700 text-white focus-visible:ring-perfume-gold placeholder:text-gray-600" placeholder="India" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="gap-4 border-t border-neutral-800 pt-6 mt-4">
                    <Button type="button" variant="outline" onClick={() => { setEditingId(null); setEditAddressData(null); }} className="rounded-none border-neutral-700 text-white hover:bg-neutral-800 hover:text-white uppercase tracking-widest text-[10px] font-bold">Cancel</Button>
                    <Button type="submit" className="rounded-none bg-perfume-gold text-black hover:bg-yellow-600 uppercase tracking-widest text-[10px] font-bold px-6">
                      Save Address
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            ) : (
            <Card key={addr.id} className="rounded-none border-neutral-800 shadow-none hover:border-perfume-gold transition-colors bg-neutral-900">
              <CardContent className="p-6 relative">
                {addr.is_default && (
                  <span className="absolute top-4 right-4 bg-perfume-gold text-black text-[10px] font-bold uppercase tracking-wider px-2 py-1">
                    Default
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5 text-perfume-gold" />
                  <div>
                    <p className="font-medium text-white mb-1">
                      {addr.full_name} 
                      {addr.address_type && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-neutral-800 px-2 py-0.5 rounded-full text-perfume-gold">
                          {addr.address_type}
                        </span>
                      )}
                    </p>
                    <p className="font-medium text-white mb-1">{addr.address}</p>
                    <p className="text-sm text-gray-400">
                      {addr.city}, {addr.state} {addr.zip}
                    </p>
                    <p className="text-sm text-gray-400">{addr.country}</p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-white hover:bg-neutral-800 rounded-none h-8 uppercase tracking-widest text-[10px] font-bold"
                    onClick={() => startEditing(addr)}
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-none h-8 uppercase tracking-widest text-[10px] font-bold"
                    onClick={() => {
                      if(window.confirm("Delete this address?")) deleteAddress(addr.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
            )
          ))}
        </div>
      )}

      {!isAdding && addresses.length === 0 && (
        <div className="text-center py-16 border border-dashed rounded-none border-neutral-800 bg-neutral-900">
          <MapPin className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
          <p className="text-lg text-gray-400 mb-2">No addresses saved yet.</p>
          <p className="text-sm text-gray-500 mb-6">Add a shipping address to speed up your checkout.</p>
          <Button onClick={() => setIsAdding(true)} className="rounded-none bg-perfume-gold text-black hover:bg-yellow-600 uppercase tracking-widest text-[10px] font-bold px-6">
            Add Your First Address
          </Button>
        </div>
      )}
    </div>
  );
};

// --- Wishlist Tab Component ---
const WishlistTab = () => {
  const { data: wishlist = [], isLoading } = useWishlist();

  if (isLoading) return <p>Loading your wishlist...</p>;

  return (
    <Card className="rounded-none border-neutral-800 shadow-none bg-neutral-900">
      <CardHeader>
        <CardTitle className="text-2xl font-serif text-white">My Wishlist</CardTitle>
        <CardDescription className="text-gray-400">Products you have saved for later.</CardDescription>
      </CardHeader>
      <CardContent>
        {wishlist.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-none border-neutral-800 bg-neutral-900">
            <Heart className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
            <p className="text-lg text-gray-400 mb-4">Your wishlist is empty.</p>
            <Button asChild className="rounded-none bg-perfume-gold text-black hover:bg-yellow-600 uppercase tracking-widest text-[10px] font-bold px-6">
              <Link to="/products">Discover Fragrances</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {wishlist.map((item) => (
              item.product && <ProductCard key={item.id} product={item.product} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Profile;
