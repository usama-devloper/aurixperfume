import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Pencil, Trash2, Plus, Search, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const ProductManager = () => {
  const { user, isAdmin } = useAuth();
  const { data: products = [], isLoading } = useProducts();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    price: 0,
    description: "",
    brand: "",
    category: "",
    image: "",
    inStock: true,
    featured: false,
  });

  // Redirect if user is not logged in or not an admin
  if (!user) {
    return <Navigate to="/auth?redirect=/product-manager" />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  const filteredProducts = searchQuery 
    ? products.filter(
        product => 
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === "price" ? parseFloat(value) : value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setShowDialog(true);
  };

  const handleAddNewProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      price: 0,
      description: "",
      brand: "",
      category: "",
      image: "",
      inStock: true,
      featured: false,
      rating: 0,
      reviews: 0,
    });
    setShowDialog(true);
  };

  const handleDeleteProduct = async (id: number) => {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({
      title: "Product deleted",
      description: "The product has been removed from the catalog.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (editingProduct) {
        // Edit existing product
        const { error } = await supabase
          .from("products")
          .update({
            name: formData.name,
            brand: formData.brand,
            description: formData.description,
            price: formData.price,
            image: formData.image,
            category: formData.category,
            featured: formData.featured,
            in_stock: formData.inStock,
            rating: formData.rating,
            reviews: formData.reviews,
            fragrance: formData.fragrance,
            size: formData.size,
          })
          .eq("id", editingProduct.id);
        
        if (error) throw error;
        
        toast({
          title: "Product updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Add new product
        const { error } = await supabase
          .from("products")
          .insert({
            name: formData.name || "New Product",
            brand: formData.brand || "Scent Trail",
            description: formData.description || "",
            price: formData.price || 0,
            image: formData.image || "/placeholder.svg",
            category: formData.category || "other",
            featured: formData.featured ?? false,
            in_stock: formData.inStock ?? true,
            rating: formData.rating || 0,
            reviews: formData.reviews || 0,
            fragrance: { topNotes: [], middleNotes: [], baseNotes: [] },
            size: { value: 50, unit: "ml" },
          });
        
        if (error) throw error;
        
        toast({
          title: "Product added",
          description: `${formData.name} has been added to the catalog.`,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get unique categories and brands for select options
  const categories = Array.from(new Set(products.map(p => p.category)));
  const brands = Array.from(new Set(products.map(p => p.brand)));

  if (isLoading) {
    return (
      <div className="container mx-auto py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-serif mb-6">Product Manager</h1>
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full md:w-1/2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="search"
            placeholder="Search products by name, brand, or category..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Button onClick={handleAddNewProduct} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add New Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>Manage your product inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="w-[350px]">Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.id}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>₹{product.price.toFixed(2)}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </TableCell>
                      <TableCell>{product.featured ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct 
                ? "Make changes to the product details." 
                : "Fill in the details to add a new product to your catalog."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price || 0}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category || ""}
                    onValueChange={(value) => handleSelectChange("category", value)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select 
                  value={formData.brand || ""}
                  onValueChange={(value) => handleSelectChange("brand", value)}
                >
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="image">Product Image</Label>
                <div className="flex gap-2">
                  <Input
                    id="image"
                    name="image"
                    value={formData.image || ""}
                    onChange={handleInputChange}
                    placeholder="/placeholder.svg or URL"
                    className="flex-1"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingImage(true);
                        try {
                          const fileExt = file.name.split(".").pop();
                          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                          const filePath = `products/${fileName}`;

                          const { error: uploadError } = await supabase.storage
                            .from("product-images")
                            .upload(filePath, file);

                          if (uploadError) throw uploadError;

                          const { data: { publicUrl } } = supabase.storage
                            .from("product-images")
                            .getPublicUrl(filePath);

                          setFormData(prev => ({ ...prev, image: publicUrl }));
                          toast({ title: "Image uploaded", description: "Image uploaded to Supabase Storage successfully." });
                        } catch (err: any) {
                          console.error("Storage upload error:", err);
                          toast({
                            title: "Upload note",
                            description: "Storage bucket not yet public or failed. You can paste the image URL directly.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsUploadingImage(false);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" asChild disabled={isUploadingImage}>
                      <span>{isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</span>
                    </Button>
                  </label>
                </div>
                {formData.image && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={formData.image} alt="Preview" className="w-12 h-12 object-cover rounded border" />
                    <span className="text-xs text-muted-foreground truncate max-w-[240px]">{formData.image}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ""}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="inStock"
                  checked={formData.inStock ?? true}
                  onCheckedChange={(checked) => handleSwitchChange("inStock", checked)}
                />
                <Label htmlFor="inStock">In Stock</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.featured ?? false}
                  onCheckedChange={(checked) => handleSwitchChange("featured", checked)}
                />
                <Label htmlFor="featured">Featured Product</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProduct ? "Save Changes" : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManager;
