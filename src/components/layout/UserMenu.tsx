import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { LogOut, PackageCheck, User, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export const UserMenu = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative shrink-0 flex items-center justify-center text-foreground hover:text-[#C5A880] hover:bg-[#EFECE6]/60 dark:hover:bg-[#1B1918] transition-colors h-10 w-10 rounded-full"
          aria-label="User account menu"
        >
          <User className="h-[18px] w-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-card text-card-foreground shadow-xl rounded-lg border border-border py-2 z-50">
        {user ? (
          <>
            <div className="px-4 py-3 border-b border-border/70">
              <p className="font-serif font-semibold text-sm text-foreground">My Account</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
            </div>
            <div className="py-1">
              <DropdownMenuItem asChild className="px-4 py-2.5 hover:bg-muted/70 focus:bg-muted/70 cursor-pointer rounded-none text-xs font-medium">
                <Link to="/profile" className="w-full flex items-center">
                  <User className="mr-2.5 h-4 w-4 text-primary" />
                  My Profile & Addresses
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="px-4 py-2.5 hover:bg-muted/70 focus:bg-muted/70 cursor-pointer rounded-none text-xs font-medium">
                <Link to="/orders" className="w-full flex items-center">
                  <PackageCheck className="mr-2.5 h-4 w-4 text-primary" />
                  My Orders
                </Link>
              </DropdownMenuItem>
            </div>
            
            {isAdmin && (
              <>
                <DropdownMenuSeparator className="my-1 bg-border/70" />
                <div className="py-1">
                  <DropdownMenuItem asChild className="px-4 py-2.5 hover:bg-muted/70 focus:bg-muted/70 cursor-pointer rounded-none text-xs font-semibold text-primary">
                    <Link to="/admin" className="w-full flex items-center">
                      <ShieldCheck className="mr-2.5 h-4 w-4" />
                      Admin Hub
                    </Link>
                  </DropdownMenuItem>
                </div>
              </>
            )}
            
            <DropdownMenuSeparator className="my-1 bg-border/70" />
            <div className="py-1">
              <DropdownMenuItem 
                onClick={handleSignOut} 
                className="px-4 py-2.5 text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer rounded-none text-xs font-medium"
              >
                <LogOut className="mr-2.5 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </div>
          </>
        ) : (
          <div className="p-2 space-y-1">
            <DropdownMenuItem asChild className="px-4 py-2.5 hover:bg-muted/70 focus:bg-muted/70 cursor-pointer rounded-md text-xs font-semibold">
              <Link to="/auth?tab=signin" className="w-full flex items-center">Sign in</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer rounded-md text-xs font-semibold">
              <Link to="/auth?tab=signup" className="w-full flex items-center">Create account</Link>
            </DropdownMenuItem>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
