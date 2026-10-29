import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, PackageCheck, User, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { NavbarSearch } from "./NavbarSearch";
import { ThemeToggle } from "./ThemeToggle";

interface MobileMenuProps {
  isOpen: boolean;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}

export const MobileMenu = ({ isOpen, onSignOut, onClose }: MobileMenuProps) => {
  const { user, isAdmin } = useAuth();
  
  if (!isOpen) return null;

  return (
    <div className="md:hidden bg-[#FAF8F5] dark:bg-[#141211] border-b border-[#E7E2D9] dark:border-[#302C2A] shadow-xl animate-fade-in">
      <div className="container mx-auto px-6 py-6">
        {/* Mobile Search */}
        <div className="mb-6">
          <NavbarSearch isMobile onClose={onClose} />
        </div>
        
        {/* Mobile Nav Links */}
        <nav className="flex flex-col space-y-1">
          <Link 
            to="/products" 
            onClick={onClose} 
            className="text-[#1C1917] dark:text-[#FAF8F5] hover:text-[#C5A880] transition-colors py-3 px-3 rounded-md hover:bg-[#EFECE6]/50 dark:hover:bg-[#1B1918] font-medium uppercase tracking-widest text-xs"
          >
            Collection
          </Link>
          <Link 
            to="/categories" 
            onClick={onClose} 
            className="text-[#1C1917] dark:text-[#FAF8F5] hover:text-[#C5A880] transition-colors py-3 px-3 rounded-md hover:bg-[#EFECE6]/50 dark:hover:bg-[#1B1918] font-medium uppercase tracking-widest text-xs"
          >
            Categories
          </Link>
          <Link 
            to="/about" 
            onClick={onClose} 
            className="text-[#1C1917] dark:text-[#FAF8F5] hover:text-[#C5A880] transition-colors py-3 px-3 rounded-md hover:bg-[#EFECE6]/50 dark:hover:bg-[#1B1918] font-medium uppercase tracking-widest text-xs"
          >
            Our Story
          </Link>
          <Link 
            to="/order-tracking" 
            onClick={onClose} 
            className="text-[#1C1917] dark:text-[#FAF8F5] hover:text-[#C5A880] transition-colors py-3 px-3 rounded-md hover:bg-[#EFECE6]/50 dark:hover:bg-[#1B1918] font-medium uppercase tracking-widest text-xs"
          >
            Track Order
          </Link>
          
          <div className="border-t border-[#E7E2D9] dark:border-[#302C2A] my-2"></div>
          <ThemeToggle showLabel className="px-3" />
          
          {user && (
            <>
              <div className="border-t border-[#E7E2D9] dark:border-[#302C2A] my-2"></div>
              <Link 
                to="/profile" 
                onClick={onClose} 
                className="text-[#1C1917]/80 dark:text-[#FAF8F5]/80 hover:text-[#C5A880] transition-colors py-3 px-3 rounded-md hover:bg-[#EFECE6]/50 dark:hover:bg-[#1B1918] flex items-center text-xs uppercase tracking-wider font-medium"
              >
                <User className="mr-2 h-4 w-4 text-[#C5A880]" />
                My Profile
              </Link>
              <Link 
                to="/orders" 
                onClick={onClose} 
                className="text-[#1C1917]/80 dark:text-[#FAF8F5]/80 hover:text-[#C5A880] transition-colors py-3 px-3 rounded-md hover:bg-[#EFECE6]/50 dark:hover:bg-[#1B1918] flex items-center text-xs uppercase tracking-wider font-medium"
              >
                <PackageCheck className="mr-2 h-4 w-4 text-[#C5A880]" />
                My Orders
              </Link>
            </>
          )}
          
          {isAdmin && (
            <>
              <div className="border-t border-[#E7E2D9] dark:border-[#302C2A] my-2"></div>
              <Link 
                to="/admin" 
                onClick={onClose} 
                className="text-[#C5A880] hover:text-[#B59468] transition-colors py-3 px-3 rounded-md hover:bg-[#EFECE6]/50 dark:hover:bg-[#1B1918] flex items-center text-xs uppercase tracking-wider font-semibold"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admin Hub
              </Link>
            </>
          )}
          
          {user ? (
            <>
              <div className="border-t border-[#E7E2D9] dark:border-[#302C2A] my-2"></div>
              <Button 
                onClick={() => {
                  onClose();
                  onSignOut();
                }} 
                variant="ghost" 
                className="justify-start p-3 h-auto text-destructive hover:bg-destructive/10 rounded-md text-xs uppercase tracking-wider font-medium w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <div className="border-t border-[#E7E2D9] dark:border-[#302C2A] my-2"></div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link 
                  to="/auth?tab=signin" 
                  onClick={onClose} 
                  className="text-center py-2.5 px-3 rounded-md border border-[#1C1917]/20 text-[#1C1917] dark:text-[#FAF8F5] text-xs font-semibold tracking-wider uppercase hover:border-[#C5A880]"
                >
                  Sign in
                </Link>
                <Link 
                  to="/auth?tab=signup" 
                  onClick={onClose} 
                  className="text-center py-2.5 px-3 rounded-md bg-[#C5A880] text-[#1C1917] text-xs font-semibold tracking-wider uppercase hover:bg-[#B8996F]"
                >
                  Register
                </Link>
              </div>
            </>
          )}
        </nav>
      </div>
    </div>
  );
};
