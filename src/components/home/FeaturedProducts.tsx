import { useState, useEffect } from "react";
import ProductCard from "@/components/product/ProductCard";
import { useFeaturedProducts } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const FeaturedProducts = () => {
  const { data: featuredProducts = [], isLoading } = useFeaturedProducts();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (featuredProducts.length === 0) return;
    
    const imagePromises = featuredProducts.map(product => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = product.image;
      });
    });

    Promise.all(imagePromises).then(() => setIsLoaded(true)).catch(() => setIsLoaded(true));
  }, [featuredProducts]);

  if (isLoading) {
    return (
      <div className="py-16">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#C5A880]" />
        </div>
      </div>
    );
  }

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold tracking-[0.25em] text-[#C5A880] uppercase mb-2 block">
            Curated Selection
          </span>
          <h2 className="text-3xl lg:text-4xl font-serif font-medium text-foreground mb-3">
            Featured Creations
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
            Discover our most sought-after olfactory compositions, handcrafted with rare botanical absolutes and exquisite resins.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/products" className="btn-secondary inline-flex px-8 py-3.5">
            View Complete Collection →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
