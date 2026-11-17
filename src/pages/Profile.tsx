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
import { PackageCheck, MapPin, User, Shield, MapPinPlus, Trash2, Pencil, Heart, Loader2 } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import ProductCard from "@/components/product/ProductCard";

const Profile = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mx-auto py-24 flex flex-col justify-center items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#C5A880]" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/profile" replace />;
  }

  return (
    <div className="container mx-auto py-12 px-4 lg:px-8 max-w-6xl">
      <div className="mb-8">
        <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-1 block">
          Client Sanctuary
        </span>
        <h1 className="text-3xl font-serif font-medium text-foreground">My Account</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your order history, delivery addresses, and personal profile.</p>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="mb-8 bg-muted/60 border border-border rounded-lg p-1 h-auto flex flex-wrap gap-1 max-w-2xl">
          <TabsTrigger value="orders" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-5 py-2.5 font-semibold uppercase tracking-wider text-xs">
            <PackageCheck className="w-3.5 h-3.5 mr-2 text-[#C5A880]" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-5 py-2.5 font-semibold uppercase tracking-wider text-xs">
            <User className="w-3.5 h-3.5 mr-2 text-[#C5A880]" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="addresses" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-5 py-2.5 font-semibold uppercase tracking-wider text-xs">
            <MapPin className="w-3.5 h-3.5 mr-2 text-[#C5A880]" />
            Addresses
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-5 py-2.5 font-semibold uppercase tracking-wider text-xs">
            <Heart className="w-3.5 h-3.5 mr-2 text-[#C5A880]" />
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
    <Card className="rounded-xl border border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-serif text-foreground">Order History</CardTitle>
        <CardDescription className="text-muted-foreground text-xs">Review details, status, and tracking for all previous orders.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#C5A880]" />
          </div>
        ) : orders.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40 border-b border-border">
                <TableRow className="border-border">
                  <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Ref</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold text-foreground">{order.order_number}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full capitalize ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        order.status === 'shipped' ? 'bg-[#C5A880]/20 text-[#9A7B4F] dark:text-[#C5A880]' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs text-foreground">
                      ₹{order.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="rounded-md border-border text-foreground hover:bg-muted text-xs font-semibold uppercase tracking-wider h-8" asChild>
                        <Link to={`/order-tracking?id=${order.id}`}>
                          Track
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed rounded-lg border-border bg-muted/10">
            <PackageCheck className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">You haven't placed any orders yet.</p>
            <p className="text-xs text-muted-foreground mb-6">Discover our curated extraits and pure attars.</p>
            <Button asChild className="btn-gold px-6">
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

  if (isLoading) return <p className="text-xs text-muted-foreground py-4">Loading client profile...</p>;

  return (
    <Card className="rounded-xl border border-border bg-card shadow-sm max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl font-serif text-foreground">Personal Information</CardTitle>
        <CardDescription className="text-muted-foreground text-xs">Update your client profile and name.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Email Address</label>
          <Input value={user?.email || ""} disabled className="bg-muted text-muted-foreground rounded-md border-border text-sm" />
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <Shield className="w-3 h-3 text-[#C5A880]" /> Verified account identity
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">First Name</label>
            <Input 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)} 
              placeholder="First Name" 
              className="rounded-md bg-background border-border text-foreground text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Last Name</label>
            <Input 
              value={lastName} 
              onChange={e => setLastName(e.target.value)} 
              placeholder="Last Name"
              className="rounded-md bg-background border-border text-foreground text-sm" 
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSave} 
          disabled={updateProfile.isPending}
          className="btn-gold h-10 px-6 text-xs uppercase tracking-wider font-semibold"
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

  if (isLoading) return <p className="text-xs text-muted-foreground py-4">Loading address book...</p>;

  return (
    <div className="space-y-6">
      {!isAdding && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-6 border border-border rounded-xl shadow-sm gap-4">
          <div>
            <h3 className="font-serif font-semibold text-lg text-foreground">Delivery Locations</h3>
            <p className="text-xs text-muted-foreground">Manage your saved home, office, and gifting addresses.</p>
          </div>
          <Button onClick={() => setIsAdding(true)} className="btn-gold h-10 px-4 text-xs font-semibold uppercase tracking-wider">
            <MapPinPlus className="w-3.5 h-3.5 mr-2" /> Add New Address
          </Button>
        </div>
      )}

      {isAdding && (
        <Card className="rounded-xl border border-border bg-card shadow-sm max-w-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-foreground">Add New Address</CardTitle>
          </CardHeader>
          <form onSubmit={handleAdd}>
            <CardContent className="space-y-4">
              <div className="space-y-2 mb-4">
                <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground block">Address Type</label>
                <RadioGroup
                  value={newAddress.address_type || "home"}
                  onValueChange={(val) => setNewAddress({...newAddress, address_type: val})}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="home" id="new-home" />
                    <label htmlFor="new-home" className="text-xs text-foreground cursor-pointer">Home</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="office" id="new-office" />
                    <label htmlFor="new-office" className="text-xs text-foreground cursor-pointer">Office</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="new-other" />
                    <label htmlFor="new-other" className="text-xs text-foreground cursor-pointer">Other</label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Full Name *</label>
                <Input required value={newAddress.full_name} onChange={e => setNewAddress({...newAddress, full_name: e.target.value})} className="rounded-md bg-background border-border text-foreground text-sm" placeholder="Rahul Sharma" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Phone *</label>
                  <Input required value={newAddress.phone || ""} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} className="rounded-md bg-background border-border text-foreground text-sm" placeholder="+91 9876543210" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Email</label>
                  <Input type="email" value={newAddress.email || ""} onChange={e => setNewAddress({...newAddress, email: e.target.value})} className="rounded-md bg-background border-border text-foreground text-sm" placeholder="john@example.com" />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Full Address *</label>
                <Input required value={newAddress.address} onChange={e => setNewAddress({...newAddress, address: e.target.value})} className="rounded-md bg-background border-border text-foreground text-sm" placeholder="123 MG Road, Bandra" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">City *</label>
                  <Input required value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="rounded-md bg-background border-border text-foreground text-sm" placeholder="Mumbai" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">State *</label>
                  <Input required value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="rounded-md bg-background border-border text-foreground text-sm" placeholder="Maharashtra" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">PIN Code *</label>
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
                    className="rounded-md bg-background border-border text-foreground text-sm" 
                    placeholder="400001" 
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Country *</label>
                  <Input required value={newAddress.country} onChange={e => setNewAddress({...newAddress, country: e.target.value})} className="rounded-md bg-background border-border text-foreground text-sm" placeholder="India" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)} className="rounded-md border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold">Cancel</Button>
              <Button type="submit" className="btn-gold text-xs uppercase tracking-wider font-semibold px-6">
                Save Address
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {!isAdding && addresses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            <Card key={addr.id} className="rounded-xl border border-border shadow-sm hover:border-[#C5A880]/60 transition-colors bg-card">
              <CardContent className="p-6 relative">
                {addr.is_default && (
                  <span className="absolute top-4 right-4 bg-[#C5A880] text-[#1C1917] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Default
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5 text-[#C5A880]" />
                  <div>
                    <p className="font-semibold text-sm text-foreground mb-1">
                      {addr.full_name} 
                      {addr.address_type && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                          {addr.address_type}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-foreground/90 leading-relaxed">{addr.address}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {addr.city}, {addr.state} {addr.zip}
                    </p>
                    <p className="text-xs text-muted-foreground">{addr.country}</p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-border flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground text-xs font-medium h-8"
                    onClick={() => startEditing(addr)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:bg-destructive/10 text-xs font-medium h-8"
                    onClick={() => {
                      if(window.confirm("Delete this address?")) deleteAddress(addr.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isAdding && addresses.length === 0 && (
        <div className="text-center py-16 border border-dashed rounded-xl border-border bg-card">
          <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No addresses saved yet.</p>
          <p className="text-xs text-muted-foreground mb-6">Add a shipping destination to enjoy expedited checkout.</p>
          <Button onClick={() => setIsAdding(true)} className="btn-gold px-6 text-xs uppercase tracking-wider font-semibold">
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

  if (isLoading) return <p className="text-xs text-muted-foreground py-4">Loading your private wishlist...</p>;

  return (
    <Card className="rounded-xl border border-border shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="text-2xl font-serif text-foreground">Curated Wishlist</CardTitle>
        <CardDescription className="text-muted-foreground text-xs">Creations reserved for your future fragrance collection.</CardDescription>
      </CardHeader>
      <CardContent>
        {wishlist.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-lg border-border bg-muted/10">
            <Heart className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Your wishlist is currently empty.</p>
            <p className="text-xs text-muted-foreground mb-6">Click the heart icon on any creation to save it here.</p>
            <Button asChild className="btn-gold px-6">
              <Link to="/products">Explore Fragrance Gallery</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
