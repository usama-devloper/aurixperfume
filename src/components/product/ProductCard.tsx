import { useState } from "react";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useWishlist, useToggleWishlist } from "@/hooks/useWishlist";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import ProductImage from "./ProductImage";
import ProductInfo from "./ProductInfo";
import ProductActions from "./ProductActions";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const shouldReduceMotion = useReducedMotion();
  const { addItem, updateQuantity, removeItem, items } = useCart();
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: wishlist = [] } = useWishlist();
  const toggleWishlist = useToggleWishlist();

  const isWishlisted = wishlist.some(item => item.product_id === product.id);

  // Check if product is already in cart and get its quantity
  const cartItem = items.find(item => item.product.id === product.id);
  const isInCart = !!cartItem;
  const cartQuantity = cartItem?.quantity || 0;

  const handleAddToCart = () => {
    setIsAdding(true);
    addItem(product, quantity);
    setIsAddedToCart(true);

    setTimeout(() => {
      setIsAdding(false);
    }, 1000);
  };

  const handleIncreaseQuantity = () => {
    if (isInCart) {
      if (cartQuantity < 10) {
        updateQuantity(product.id, cartQuantity + 1);
      }
    } else {
      setQuantity(prev => Math.min(10, prev + 1));
    }
  };

  const handleDecreaseQuantity = () => {
    if (isInCart) {
      if (cartQuantity > 1) {
        updateQuantity(product.id, cartQuantity - 1);
      } else {
        removeItem(product.id);
        setIsAddedToCart(false);
      }
    } else {
      setQuantity(prev => Math.max(1, prev - 1));
    }
  };

  const handleAddMoreToCart = () => {
    setIsAdding(true);
    addItem(product, quantity);

    setTimeout(() => {
      setIsAdding(false);
    }, 1000);
  };

  const handleRemoveFromCart = () => {
    removeItem(product.id);
    setIsAddedToCart(false);
  };

  const showAsAddedToCart = isAddedToCart || isInCart;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist.mutate(
      { productId: product.id, isWishlisted },
      {
        onError: (err: any) => {
          if (err.message?.includes("logged in")) {
            toast({
              title: "Login Required",
              description: "Please log in to add items to your wishlist.",
              variant: "default",
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
            description: `${product.name} has been ${data.action} your wishlist.`,
          });
        }
      }
    );
  };

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 25 }}
      className="h-full group"
    >
      <Card className="h-full flex flex-col overflow-hidden bg-card border border-border/70 rounded-md shadow-sm group-hover:shadow-md group-hover:border-[#C5A880]/60 transition-all duration-300">
        <div className="relative overflow-hidden">
          <ProductImage product={product} />
          <button 
            onClick={handleWishlistClick}
            className="absolute top-3 right-3 p-2 bg-black/25 hover:bg-black/55 text-[#F7F3EC] backdrop-blur-md rounded-full shadow-sm hover:scale-110 active:scale-95 transition-all z-10 border border-white/15 hover:border-[#C5A880]/60"
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart 
              className={`w-3.5 h-3.5 transition-colors ${
                isWishlisted ? 'fill-[#C5A880] text-[#C5A880]' : 'text-[#F7F3EC]/80 hover:text-[#C5A880]'
              }`} 
            />
          </button>
        </div>

        <CardContent className="p-3 sm:p-4 lg:p-5 flex flex-col flex-grow justify-between">
          <ProductInfo product={product} />

          <div className="mt-3.5 pt-3 border-t border-border/50">
            <ProductActions
              product={product}
              quantity={quantity}
              cartQuantity={cartQuantity}
              isInCart={isInCart}
              isAdding={isAdding}
              showAsAddedToCart={showAsAddedToCart}
              onAddToCart={handleAddToCart}
              onAddMoreToCart={handleAddMoreToCart}
              onIncreaseQuantity={handleIncreaseQuantity}
              onDecreaseQuantity={handleDecreaseQuantity}
              onRemoveFromCart={handleRemoveFromCart}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProductCard;
