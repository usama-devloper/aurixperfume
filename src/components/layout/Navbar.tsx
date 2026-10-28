import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import { NavbarSearch } from "./NavbarSearch";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";
import { CartButton } from "./CartButton";
import { useSiteSetting } from "@/hooks/useSiteSettings";

const Navbar = () => {
  const isMobile = useIsMobile();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const brandName = useSiteSetting('brand_name') || 'AURIX';

  useEffect(() => {
    // Close mobile menu when navigating or screen size changes
    setShowMobileMenu(false);
  }, [isMobile, location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navLinks = [
    { label: "Collection", path: "/products" },
    { label: "Categories", path: "/categories" },
    { label: "Our Story", path: "/about" },
    { label: "Track Order", path: "/order-tracking" },
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-[#FAF8F5]/95 dark:bg-[#141211]/95 backdrop-blur-md border-b border-[#E7E2D9] dark:border-[#302C2A] shadow-[0_2px_15px_-3px_rgba(28,25,23,0.05)]' 
        : 'bg-[#FAF8F5]/90 dark:bg-[#141211]/90 backdrop-blur-sm border-b border-[#E7E2D9]/60 dark:border-[#302C2A]/60'
    }`}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Mobile Menu Toggle */}
          {isMobile && (
            <button 
              onClick={toggleMobileMenu} 
              className="text-[#1C1917] dark:text-[#FAF8F5] hover:text-[#C5A880] transition-colors p-2 -ml-2"
              aria-label="Toggle navigation menu"
            >
              {showMobileMenu ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          )}

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-serif text-2xl lg:text-3xl font-bold tracking-[0.22em] text-[#1C1917] dark:text-[#FAF8F5] group-hover:text-[#C5A880] transition-colors uppercase">
              {brandName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="hidden md:flex space-x-10 items-center">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`text-xs font-medium tracking-[0.2em] uppercase transition-all relative py-1.5 ${
                      isActive 
                        ? 'text-[#C5A880] font-semibold' 
                        : 'text-[#1C1917]/80 dark:text-[#FAF8F5]/80 hover:text-[#C5A880]'
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#C5A880]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Section: Search & Actions */}
          <div className="flex items-center space-x-3">
            <NavbarSearch />
            <UserMenu />
            <CartButton />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobile && (
        <MobileMenu 
          isOpen={showMobileMenu} 
          onSignOut={handleSignOut} 
          onClose={() => setShowMobileMenu(false)} 
        />
      )}
    </header>
  );
};

export default Navbar;
