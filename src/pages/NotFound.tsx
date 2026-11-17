import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-background px-4 py-16">
      <div className="text-center max-w-md">
        <Sparkles className="w-8 h-8 text-[#C5A880] mx-auto mb-4" />
        <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
          Error 404
        </span>
        <h1 className="text-4xl sm:text-5xl font-serif font-medium text-foreground tracking-tight mb-3">
          Scent Not Found
        </h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          The sanctuary or creation you are searching for does not exist in our library, or has been gently moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="btn-gold px-6">
            <Link to="/">Return to Maison</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-md border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold px-6">
            <Link to="/products">Explore Collections</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
