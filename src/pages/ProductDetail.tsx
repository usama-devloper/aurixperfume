import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useProduct, useRelatedProducts } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/product/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWishlist, useToggleWishlist } from "@/hooks/useWishlist";
import { useReviews, useAddReview } from "@/hooks/useReviews";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Plus, Minus, Check, Loader2, Heart, Star, Sparkles, ShieldCheck, Truck, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ScentPyramid } from "@/components/product/ScentPyramid";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const productId = parseInt(id || "0");
  const { data: product, isLoading, error } = useProduct(productId);
  const { data: relatedProducts = [] } = useRelatedProducts(productId, product?.category || "");
  const { items, addItem, updateQuantity } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const cartItem = items.find(item => item.product.id === productId);
  const isInCart = Boolean(cartItem);
  const cartQuantity = cartItem?.quantity || 0;

  const [quantity, setQuantity] = useState(1);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const showInBagView = (isInCart || justAdded) && !isAdjusting;

  useEffect(() => {
    if (isInCart && !isAdjusting) {
      setQuantity(cartQuantity);
    }
  }, [isInCart, cartQuantity, isAdjusting]);
  
  const { data: wishlist = [] } = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const isWishlisted = wishlist.some(item => item.product_id === productId);

  const { data: reviews = [] } = useReviews(productId);
  const addReview = useAddReview();
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [isHoveringRating, setIsHoveringRating] = useState(0);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleWishlist.mutate(
      { productId, isWishlisted },
      {
        onError: (err: any) => {
          if (err.message?.includes("logged in")) {
            toast({
              title: "Login Required",
              description: "Please log in to add items to your wishlist.",
            });
            navigate("/auth");
          } else {
            toast({
              title: "Error",
              description: "Could not update wishlist. Please try again.",
              variant: "destructive",
            });
          }
        },
        onSuccess: (data) => {
          toast({
            title: data.action === 'added' ? "Added to Wishlist" : "Removed from Wishlist",
            description: `${product?.name} has been ${data.action} your wishlist.`,
          });
        }
      }
    );
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    addReview.mutate({ productId, rating, reviewText }, {
      onSuccess: () => {
        setReviewText("");
        setRating(5);
        toast({
          title: "Review Submitted",
          description: "Thank you for sharing your thoughts!",
        });
      },
      onError: (error) => {
        console.error("Review submission error:", error);
        toast({
          title: "Error",
          description: "Could not submit review. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col justify-center items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#C5A880]" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Unveiling fragrance details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-md">
        <Sparkles className="w-8 h-8 text-[#C5A880] mx-auto mb-3" />
        <h2 className="text-2xl font-serif mb-2 text-foreground">Creation Not Found</h2>
        <p className="text-sm text-muted-foreground mb-6">We could not locate the requested perfume in our catalog.</p>
        <Button onClick={() => navigate("/products")} className="btn-primary">
          Back to Collection
        </Button>
      </div>
    );
  }

  const handleQuantityChange = (newValue: number) => {
    if (newValue >= 1 && newValue <= 10) {
      setQuantity(newValue);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    setJustAdded(true);
    setIsAdjusting(false);
  };

  const handleUpdateQuantityInCart = () => {
    if (!product) return;
    updateQuantity(product.id, quantity);
    setIsAdjusting(false);
    toast({
      title: "Bag Updated",
      description: `${product.name} quantity updated to ${quantity}.`,
    });
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10 max-w-7xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 text-xs text-muted-foreground tracking-wider uppercase">
        <ol className="flex items-center gap-2">
          <li>
            <Link to="/" className="hover:text-foreground transition-colors">Maison</Link>
          </li>
          <li className="text-border">/</li>
          <li>
            <Link to="/products" className="hover:text-foreground transition-colors">Collection</Link>
          </li>
          <li className="text-border">/</li>
          <li className="text-foreground font-medium truncate max-w-[200px]">{product.name}</li>
        </ol>
      </nav>

      {/* Product Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Product Image Frame */}
        <div className="bg-[#FAF8F5] dark:bg-[#1B1918] rounded-xl overflow-hidden relative border border-border shadow-sm group">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full aspect-square object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <button 
            onClick={handleWishlistClick}
            className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-black/75 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-all z-10 border border-border/60"
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart 
              className={`w-5 h-5 transition-colors ${
                isWishlisted ? 'fill-[#C5A880] text-[#C5A880]' : 'text-muted-foreground hover:text-[#C5A880]'
              }`} 
            />
          </button>
        </div>

        {/* Product Info Column */}
        <div className="flex flex-col">
          <div className="mb-2">
            <span className="text-[11px] font-semibold tracking-[0.25em] text-[#C5A880] uppercase">
              {product.brand} · Haute Parfumerie
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-foreground tracking-tight mb-3">
            {product.name}
          </h1>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="flex text-[#C5A880] text-sm">
              {"★".repeat(Math.max(0, Math.min(5, Math.floor(product.rating || 5))))}
              {"☆".repeat(Math.max(0, 5 - Math.min(5, Math.floor(product.rating || 5))))}
            </div>
            <span className="text-xs text-muted-foreground">({product.reviews || 0} reviews)</span>
            <span className="text-border">•</span>
            <span className="text-xs font-medium text-foreground">
              {product.size ? `${product.size.value}${product.size.unit}` : "50ml"}
            </span>
          </div>
          
          <div className="mb-6 pb-6 border-b border-border/80">
            <p className="text-2xl sm:text-3xl font-semibold text-foreground">
              ₹{(product.price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Inclusive of all taxes · Complimentary courier dispatch</p>
          </div>
          
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Olfactive Description</h3>
            <p className="text-sm text-foreground/90 leading-relaxed font-light">{product.description}</p>
          </div>
          
          {/* Quantity Selector & Add to Bag */}
          <div className="mb-8 space-y-4">
            {!showInBagView && (
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Quantity:</span>
                <div className="flex items-center bg-muted/40 border border-border rounded-md h-10 text-foreground overflow-hidden">
                  <button 
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="w-10 h-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center border-r border-border disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880]"
                    disabled={quantity <= 1}
                    aria-label={`Decrease quantity of ${product.name}`}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-12 text-center text-sm font-semibold">{quantity}</span>
                  <button 
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="w-10 h-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center border-l border-border disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880]"
                    disabled={quantity >= 10}
                    aria-label={`Increase quantity of ${product.name}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            {!showInBagView ? (
              isInCart ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleUpdateQuantityInCart}
                    disabled={!product.inStock}
                    className="w-full sm:w-auto min-w-[200px] rounded-md bg-[#C5A880] text-[#1C1917] hover:bg-[#B8996F] uppercase tracking-wider text-xs font-semibold h-12 px-8 shadow-sm flex items-center justify-center"
                  >
                    <Check className="mr-2" size={16} />
                    Update in Bag ({quantity})
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setQuantity(cartQuantity);
                      setIsAdjusting(false);
                    }}
                    className="rounded-md border-border bg-background text-foreground hover:bg-muted uppercase tracking-wider text-xs font-semibold h-12 px-6"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="w-full sm:w-auto min-w-[220px] rounded-md bg-[#C5A880] text-[#1C1917] hover:bg-[#B8996F] uppercase tracking-wider text-xs font-semibold h-12 px-8 shadow-sm flex items-center justify-center"
                >
                  <ShoppingBag className="mr-2" size={16} />
                  {product.inStock ? "Add to Bag" : "Currently Out of Stock"}
                </Button>
              )
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => navigate("/cart")}
                  className="rounded-md bg-[#1C1917] text-[#FAF8F5] hover:bg-[#2B2724] uppercase tracking-wider text-xs font-semibold h-12 px-8 shadow-sm flex items-center justify-center"
                >
                  <ShoppingBag className="mr-2" size={16} />
                  View in Bag ({cartQuantity || quantity})
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setQuantity(cartQuantity || quantity);
                    setIsAdjusting(true);
                  }}
                  className="rounded-md border-border bg-background text-foreground hover:bg-muted uppercase tracking-wider text-xs font-semibold h-12 px-6"
                >
                  Adjust Quantity
                </Button>
              </div>
            )}
            
            {!product.inStock && (
              <p className="text-xs text-destructive mt-2">This artisanal batch is currently reserved. Check back soon for restock.</p>
            )}
          </div>

          {/* Guarantees Strip */}
          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-border/80 text-center">
            <div className="flex flex-col items-center p-2 rounded-lg bg-card border border-border/60">
              <Truck className="w-4 h-4 text-[#C5A880] mb-1.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Free Shipping</span>
              <span className="text-[9px] text-muted-foreground">Orders over ₹1,000</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-card border border-border/60">
              <ShieldCheck className="w-4 h-4 text-[#C5A880] mb-1.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">100% Authentic</span>
              <span className="text-[9px] text-muted-foreground">Original flacon</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-card border border-border/60">
              <RefreshCw className="w-4 h-4 text-[#C5A880] mb-1.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">White-Glove</span>
              <span className="text-[9px] text-muted-foreground">Concierge support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Olfactive Information Tabs */}
      <div className="mt-16 lg:mt-24">
        <Tabs defaultValue="fragrance" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8 bg-muted/60 border border-border rounded-lg p-1 max-w-2xl">
            <TabsTrigger value="fragrance" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md text-xs font-medium py-2.5">Notes</TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md text-xs font-medium py-2.5">Maison Details</TabsTrigger>
            <TabsTrigger value="shipping" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md text-xs font-medium py-2.5">Delivery</TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md text-xs font-medium py-2.5">Reviews ({product.reviews})</TabsTrigger>
          </TabsList>

          <TabsContent value="fragrance" className="bg-card p-8 rounded-xl border border-border shadow-sm min-h-[320px]">
            <div className="text-center mb-6">
              <h3 className="font-serif text-xl font-medium text-foreground mb-1">The Olfactive Pyramid</h3>
              <p className="text-xs text-muted-foreground">Unfolds across top, heart, and base stages on warm skin.</p>
            </div>
            <ScentPyramid 
              topNotes={product.fragrance?.topNotes || []}
              middleNotes={product.fragrance?.middleNotes || []}
              baseNotes={product.fragrance?.baseNotes || []}
            />
          </TabsContent>

          <TabsContent value="details" className="bg-card p-8 rounded-xl border border-border shadow-sm text-sm space-y-3">
            <p><span className="font-semibold text-foreground">Fragrance Family:</span> <span className="text-muted-foreground capitalize">{product.category}</span></p>
            <p><span className="font-semibold text-foreground">Concentration:</span> <span className="text-muted-foreground">Extrait de Parfum / Concentrated Attar</span></p>
            <p><span className="font-semibold text-foreground">Maceration:</span> <span className="text-muted-foreground">60-day aging in dark glass demijohns</span></p>
            <p><span className="font-semibold text-foreground">Artisan Origin:</span> <span className="text-muted-foreground">Hand-blended in small atelier batches</span></p>
          </TabsContent>

          <TabsContent value="shipping" className="bg-card p-8 rounded-xl border border-border shadow-sm text-sm space-y-3">
            <p className="font-semibold text-foreground">Courier & Dispatch Guidelines</p>
            <p className="text-muted-foreground">Complimentary express shipping on all orders exceeding ₹1,000 across India.</p>
            <p className="text-muted-foreground">Orders are safely secured in padded luxury presentation boxes within 24 to 48 hours.</p>
            <p className="text-muted-foreground">Estimated delivery timeframe: 2 to 5 business days with door-to-door tracking.</p>
          </TabsContent>

          <TabsContent value="reviews" className="bg-card p-8 rounded-xl border border-border shadow-sm">
            {user ? (
              <form onSubmit={handleReviewSubmit} className="mb-10 p-6 rounded-lg bg-muted/30 border border-border">
                <h4 className="font-serif text-base font-semibold text-foreground mb-3">Compose Your Impression</h4>
                <div className="flex items-center gap-1.5 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setIsHoveringRating(star)}
                      onMouseLeave={() => setIsHoveringRating(0)}
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star className={`w-5 h-5 ${(isHoveringRating || rating) >= star ? 'fill-[#C5A880] text-[#C5A880]' : 'text-border'}`} />
                    </button>
                  ))}
                </div>
                <Textarea 
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your personal experience with the fragrance's longevity, projection, and mood..."
                  className="mb-4 rounded-md bg-background border-border text-foreground text-sm"
                />
                <Button type="submit" disabled={addReview.isPending} className="btn-gold px-6">
                  {addReview.isPending ? "Submitting..." : "Publish Review"}
                </Button>
              </form>
            ) : (
              <div className="mb-10 p-6 rounded-lg bg-muted/30 border border-border text-center">
                <p className="text-sm text-muted-foreground mb-4">Please sign in to share your olfactive review.</p>
                <Button asChild className="btn-secondary">
                  <Link to={`/auth?redirect=/products/${productId}`}>Sign In to Review</Link>
                </Button>
              </div>
            )}

            <div className="space-y-6">
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-sm italic text-center py-6">No patron reviews yet. Be the first to share your impression of this creation.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-b border-border/70 pb-5 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex text-[#C5A880] text-xs">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-[#C5A880] text-[#C5A880]' : 'text-border'}`} />
                          ))}
                        </div>
                        <span className="font-semibold text-xs text-foreground">
                          {review.profiles?.first_name} {review.profiles?.last_name}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(review.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed font-light">{review.review_text}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-20 pt-16 border-t border-border/80">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-[0.25em] text-[#C5A880] uppercase mb-2 block">
              Harmonious Compositions
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground">
              You May Also Appreciate
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {relatedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
