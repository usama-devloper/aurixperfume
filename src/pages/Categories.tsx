import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, LayoutGrid, List } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";

const Categories = () => {
  const [view, setView] = useState<"grid" | "list">("grid");
  const { data: categories = [], isLoading, error: categoriesError } = useCategories();
  const { data: products = [] } = useProducts();

  const countFor = (slug: string) => products.filter((p) => p.category === slug).length;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col justify-center items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#C5A880]" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Cataloging families...</p>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col justify-center items-center gap-3 text-center">
        <p className="text-sm font-medium text-destructive">Unable to catalog fragrance families at this time.</p>
        <p className="text-xs text-muted-foreground">Please refresh the page or explore our full collection directly.</p>
        <Link 
          to="/products"
          className="mt-2 text-xs uppercase tracking-widest font-semibold text-[#C5A880] hover:underline"
        >
          View Collection →
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl">
      <div className="mb-8 sm:mb-10 text-center max-w-2xl mx-auto px-2">
        <span className="text-xs font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
          Olfactive Taxonomy
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium text-foreground tracking-tight mb-3">
          Fragrance Families
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
          Explore our creations by olfactive family. Each category embodies a distinctive botanical harmony, emotional landscape, and projection profile.
        </p>
      </div>

      <div className="flex justify-end mb-6 sm:mb-8">
        <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label="Grid View"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              view === "grid" 
                ? "bg-[#C5A880] text-[#1C1917] shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid size={13} />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-label="List View"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              view === "list" 
                ? "bg-[#C5A880] text-[#1C1917] shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List size={13} />
            List
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No categories available in the library yet.</p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
          {categories.map((category) => {
            const count = countFor(category.slug);
            return (
              <Link key={category.id} to={`/products?category=${category.slug}`} className="group block h-full">
                <Card className="h-full flex flex-col overflow-hidden bg-card border border-border/80 rounded-xl hover:shadow-xl hover:border-[#C5A880]/60 transition-all duration-300">
                  <div className="aspect-[16/10] relative overflow-hidden bg-muted/30">
                    {category.image ? (
                      <img 
                        src={category.image} 
                        alt={category.name} 
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
                      />
                    ) : (
                      <div className={`w-full h-full ${category.color || "bg-[#F7F4EE] dark:bg-[#1B1918]"}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  </div>
                  <CardContent className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1.5 sm:mb-2">
                        <h3 className="font-serif text-sm sm:text-lg lg:text-xl font-medium text-foreground group-hover:text-[#C5A880] transition-colors truncate">
                          {category.name}
                        </h3>
                        <span className="bg-muted text-muted-foreground text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full whitespace-nowrap border border-border/60 shrink-0 self-start sm:self-auto">
                          {count} {count === 1 ? "creation" : "creations"}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] sm:text-xs line-clamp-2 leading-relaxed">
                        {category.description}
                      </p>
                    </div>
                    <span className="text-[#C5A880] text-[11px] sm:text-xs font-semibold uppercase tracking-wider group-hover:underline inline-flex items-center gap-1 mt-3">
                      Explore Family →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const count = countFor(category.slug);
            return (
              <Link key={category.id} to={`/products?category=${category.slug}`} className="group block">
                <Card className="overflow-hidden bg-card border border-border/80 rounded-xl hover:shadow-lg hover:border-[#C5A880]/60 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
                    <div className="w-full sm:w-56 h-36 relative flex-shrink-0 overflow-hidden bg-muted/30">
                      {category.image ? (
                        <img 
                          src={category.image} 
                          alt={category.name} 
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className={`w-full h-full ${category.color || "bg-[#F7F4EE] dark:bg-[#1B1918]"}`} />
                      )}
                    </div>
                    <CardContent className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-serif text-lg sm:text-xl font-medium text-foreground group-hover:text-[#C5A880] transition-colors">
                          {category.name}
                        </h3>
                        <span className="bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-border/60">
                          {count} {count === 1 ? "creation" : "creations"}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed max-w-xl line-clamp-2 sm:line-clamp-none">
                        {category.description}
                      </p>
                      <span className="text-[#C5A880] text-xs font-semibold uppercase tracking-wider group-hover:underline mt-4 inline-block">
                        View all fragrances →
                      </span>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Categories;
