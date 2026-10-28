import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import ProductCard from "@/components/product/ProductCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Loader2, SlidersHorizontal, Sparkles } from "lucide-react";

type TypeFilter = "all" | "attar" | "perfume";

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortOption, setSortOption] = useState<string>("default");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  
  // Mobile filter sheet and floating trigger state
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [showFloatingFilter, setShowFloatingFilter] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingFilter(window.scrollY > 350);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: products = [], isLoading, error } = useProducts();
  const { data: dbCategories = [] } = useCategories();

  // Slugs grouped by type, from DB
  const slugsByType = useMemo(() => {
    const attar = new Set(dbCategories.filter(c => c.type === "attar").map(c => c.slug));
    const perfume = new Set(dbCategories.filter(c => c.type === "perfume").map(c => c.slug));
    return { attar, perfume };
  }, [dbCategories]);

  // Visible category pills depend on selected type
  const categories = useMemo(() => {
    const filtered = typeFilter === "all"
      ? dbCategories
      : dbCategories.filter(c => c.type === typeFilter);
    return ["all", ...filtered.map(c => c.slug)];
  }, [dbCategories, typeFilter]);

  // Gather all unique scent notes
  const allScentNotes = useMemo(() => {
    const notes = new Set<string>();
    products.forEach(p => {
      p.fragrance.topNotes.forEach(n => notes.add(n));
      p.fragrance.middleNotes.forEach(n => notes.add(n));
      p.fragrance.baseNotes.forEach(n => notes.add(n));
    });
    return Array.from(notes).sort();
  }, [products]);

  // Initialize state from URL params
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    const typeParam = searchParams.get("type") as TypeFilter | null;
    const queryParam = searchParams.get("search") ?? searchParams.get("q");
    setSelectedCategory(categoryParam || "all");
    if (typeParam === "attar" || typeParam === "perfume" || typeParam === "all") {
      setTypeFilter(typeParam);
    }
    if (queryParam !== null) {
      setSearchQuery(queryParam);
    }
  }, [searchParams]);

  const handleTypeChange = (t: TypeFilter) => {
    setTypeFilter(t);
    setSelectedCategory("all");
    const next = new URLSearchParams(searchParams);
    if (t === "all") next.delete("type"); else next.set("type", t);
    next.delete("category");
    setSearchParams(next);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const newSearchParams = new URLSearchParams(searchParams);
    
    if (category === "all") {
      newSearchParams.delete("category");
    } else {
      newSearchParams.set("category", category);
    }
    
    setSearchParams(newSearchParams);
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by search query first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        product => 
          product.name.toLowerCase().includes(query) || 
          product.description?.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)
      );
    }

    // Filter by type (Attar / Perfume)
    if (typeFilter !== "all") {
      const allowed = typeFilter === "attar" ? slugsByType.attar : slugsByType.perfume;
      result = result.filter(p => allowed.has(p.category));
    }

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter(product => product.category === selectedCategory);
    }

    // Check for featured filter from URL
    if (searchParams.get("featured") === "true") {
      result = result.filter(product => product.featured);
    }

    // Filter by selected notes
    if (selectedNotes.length > 0) {
      result = result.filter(product => {
        const productNotes = [
          ...product.fragrance.topNotes,
          ...product.fragrance.middleNotes,
          ...product.fragrance.baseNotes
        ];
        return selectedNotes.some(note => productNotes.includes(note));
      });
    }

    // Sort products
    switch (sortOption) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      default:
        result.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return 0;
        });
        break;
    }

    return result;
  }, [products, selectedCategory, typeFilter, slugsByType, sortOption, searchQuery, searchParams, selectedNotes]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== "all") count++;
    if (selectedCategory !== "all") count++;
    if (selectedNotes.length > 0) count += selectedNotes.length;
    return count;
  }, [typeFilter, selectedCategory, selectedNotes]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col justify-center items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#C5A880]" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Curating collection...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <p className="text-destructive font-medium mb-4">Unable to load the fragrance gallery at this time.</p>
        <button onClick={() => window.location.reload()} className="btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  const filterContent = (
    <div className="flex flex-col gap-8">
      {/* Type selector: Attar vs Perfume */}
      <div className="bg-card p-5 rounded-lg border border-border/80 shadow-sm">
        <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-foreground mb-3">
          Collection Type
        </h3>
        <div className="flex flex-col gap-1.5">
          {([
            { value: "all", label: "All Formulations" },
            { value: "perfume", label: "Signature Parfums" },
            { value: "attar", label: "Luxury Attars" },
          ] as { value: TypeFilter; label: string }[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTypeChange(opt.value)}
              className={`px-3.5 py-2.5 text-left rounded-md text-xs font-semibold tracking-wide transition-all ${
                typeFilter === opt.value
                  ? "bg-[#C5A880] text-[#1C1917] shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="bg-card p-5 rounded-lg border border-border/80 shadow-sm">
        <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-foreground mb-3">
          Fragrance Families
        </h3>
        <div className="flex flex-col gap-1.5">
          {categories.map((category) => (
            <button
              key={category}
              className={`px-3.5 py-2 text-left rounded-md text-xs font-medium transition-all ${
                selectedCategory === category
                  ? "bg-[#1C1917] text-[#FAF8F5] font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => handleCategoryChange(category)}
            >
              {category === "all" ? "All Families" : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Scent Notes */}
      <div className="bg-card p-5 rounded-lg border border-border/80 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-foreground">
            Botanical Notes
          </h3>
          {selectedNotes.length > 0 && (
            <button 
              onClick={() => setSelectedNotes([])} 
              className="text-[11px] text-[#C5A880] hover:underline uppercase tracking-wider"
            >
              Reset
            </button>
          )}
        </div>
        <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-wrap gap-1.5 custom-scrollbar">
          {allScentNotes.map((note) => (
            <button
              key={note}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                selectedNotes.includes(note)
                  ? "bg-[#C5A880] text-[#1C1917] border-[#C5A880]"
                  : "bg-muted/40 border-border/80 text-muted-foreground hover:border-[#C5A880] hover:text-foreground"
              }`}
              onClick={() => {
                setSelectedNotes(prev => 
                  prev.includes(note) 
                    ? prev.filter(n => n !== note)
                    : [...prev, note]
                );
              }}
            >
              {note}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 lg:px-8 py-5 sm:py-7 lg:py-8">
      {/* Compact Editorial Page Header */}
      <div className="text-center mb-5 sm:mb-6 pt-1">
        <span className="text-[10px] sm:text-[11px] font-semibold tracking-[0.25em] text-[#C5A880] uppercase block mb-1">
          THE COLLECTION
        </span>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-medium text-foreground tracking-tight">
          Discover your signature fragrance.
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:flex w-full lg:w-1/4 flex-col gap-6">
          {filterContent}
        </aside>

        {/* Main Content Area */}
        <main className="w-full lg:w-3/4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-5 gap-3 border-b border-border/80 pb-3 sm:pb-4">
            <h2 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-muted-foreground whitespace-nowrap">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'Creation' : 'Creations'}
            </h2>
            
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* Embedded Compact Search */}
              <div className="relative w-full sm:w-48 lg:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
                <Input
                  type="search"
                  placeholder="Search collection..."
                  className="pl-8 pr-3 w-full bg-card border-border text-foreground placeholder:text-muted-foreground rounded-md h-9 text-xs focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Desktop Sorting */}
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Sort by:</span>
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-[180px] bg-card border-border text-foreground rounded-md text-xs font-medium h-9">
                    <SelectValue placeholder="Featured" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground rounded-md">
                    <SelectItem value="default" className="text-xs cursor-pointer">Curated Bestsellers</SelectItem>
                    <SelectItem value="price-asc" className="text-xs cursor-pointer">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc" className="text-xs cursor-pointer">Price: High to Low</SelectItem>
                    <SelectItem value="name-asc" className="text-xs cursor-pointer">Name: A to Z</SelectItem>
                    <SelectItem value="name-desc" className="text-xs cursor-pointer">Name: Z to A</SelectItem>
                    <SelectItem value="rating" className="text-xs cursor-pointer">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Filter Toolbar (Immediate accessibility, no scroll requirement) */}
          <div className="lg:hidden mb-6 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <button 
                onClick={() => setIsFilterSheetOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border/80 text-foreground rounded-md text-xs font-medium tracking-wider uppercase shadow-sm hover:border-[#C5A880]/60 transition-colors"
                aria-label="Open filter and sorting options"
              >
                <SlidersHorizontal size={13} className="text-[#C5A880]" />
                <span>Filter & Sort</span>
                {activeFiltersCount > 0 && (
                  <span className="inline-flex items-center justify-center bg-[#C5A880] text-[#1C1917] rounded-full w-4 h-4 text-[10px] font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {(activeFiltersCount > 0 || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setTypeFilter("all");
                    setSearchQuery("");
                    setSortOption("default");
                    setSelectedNotes([]);
                    setSearchParams({});
                  }}
                  className="text-xs text-[#C5A880] uppercase tracking-wider font-medium hover:underline"
                >
                  Reset All
                </button>
              )}
            </div>

            {/* Quick Horizontal Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                onClick={() => handleTypeChange("all")}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  typeFilter === "all" && selectedCategory === "all"
                    ? "bg-[#1C1917] text-[#FAF8F5] border border-[#C5A880]/50 shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleTypeChange("perfume")}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  typeFilter === "perfume"
                    ? "bg-[#C5A880] text-[#1C1917] font-semibold shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Signature Parfums
              </button>
              <button
                onClick={() => handleTypeChange("attar")}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  typeFilter === "attar"
                    ? "bg-[#C5A880] text-[#1C1917] font-semibold shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Luxury Attars
              </button>
              {dbCategories.slice(0, 6).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat.slug
                      ? "bg-[#1C1917] text-[#FAF8F5] border border-[#C5A880]/50 shadow-sm font-semibold"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-lg border border-border/70 p-8">
              <Sparkles className="w-8 h-8 text-[#C5A880] mx-auto mb-3" />
              <h3 className="font-serif text-lg font-medium text-foreground mb-1">No matching creations found</h3>
              <p className="text-sm text-muted-foreground mb-6">Try refining your search terms or clearing selected filter tags.</p>
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setTypeFilter("all");
                  setSearchQuery("");
                  setSortOption("default");
                  setSelectedNotes([]);
                  setSearchParams({});
                }}
                className="btn-gold px-6 py-2.5"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Reusable Mobile Filter & Sort Sheet */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] bg-card border-t border-border p-0 text-foreground rounded-t-2xl flex flex-col z-50">
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <SheetHeader className="mb-6 text-left">
              <SheetTitle className="text-2xl font-serif text-foreground">Filter & Sort</SheetTitle>
            </SheetHeader>
            
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-2">Sort By</h3>
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-full bg-background border-border text-foreground rounded-md text-xs">
                    <SelectValue placeholder="Featured" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground rounded-md">
                    <SelectItem value="default">Curated Bestsellers</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="name-asc">Name: A to Z</SelectItem>
                    <SelectItem value="name-desc">Name: Z to A</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {filterContent}
            </div>
          </div>
          
          {/* Sticky Action Footer */}
          <div className="p-4 border-t border-border bg-card flex justify-between gap-4 mt-auto">
            <button 
              onClick={() => {
                setSelectedCategory("all");
                setTypeFilter("all");
                setSearchQuery("");
                setSortOption("default");
                setSelectedNotes([]);
                setSearchParams({});
                setIsFilterSheetOpen(false);
              }}
              className="px-4 py-3 border border-border text-foreground w-1/2 text-xs font-semibold uppercase tracking-wider rounded-md hover:bg-muted"
            >
              Clear
            </button>
            <button 
              onClick={() => setIsFilterSheetOpen(false)}
              className="px-4 py-3 bg-[#C5A880] text-[#1C1917] w-1/2 text-xs font-semibold uppercase tracking-wider rounded-md hover:bg-[#B8996F]"
            >
              Show Results
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Floating Mobile Filter Button for mid-scroll convenience */}
      <div 
        className={`lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
          showFloatingFilter ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
        }`}
      >
        <button 
          onClick={() => setIsFilterSheetOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] border border-[#C5A880]/50 text-[#FAF8F5] shadow-2xl rounded-full text-xs font-semibold tracking-wider uppercase hover:bg-[#2B2724] transition-colors"
          aria-label="Open filter and sorting options"
        >
          <SlidersHorizontal size={13} className="text-[#C5A880]" />
          <span>Filter & Sort</span>
          {activeFiltersCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880]" />
          )}
        </button>
      </div>
    </div>
  );
};

export default Products;
