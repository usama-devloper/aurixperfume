import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface NavbarSearchProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export const NavbarSearch = ({
  isMobile = false,
  onClose
}: NavbarSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      if (onClose) onClose();
    }
  };

  return (
    <form onSubmit={handleSearch} className={isMobile ? "w-full" : "hidden md:flex relative max-w-[220px] lg:max-w-[280px]"}>
      <div className="relative w-full">
        <Search className={`absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#78716C] pointer-events-none ${isMobile ? "size-[16px]" : "size-3.5"}`} />
        <input 
          type="text" 
          placeholder="Search fragrances..." 
          className="w-full bg-[#FFFFFF] dark:bg-[#1B1918] text-[#1C1917] dark:text-[#FAF8F5] placeholder-[#78716C] border border-[#E7E2D9] dark:border-[#302C2A] rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] transition-all shadow-sm"
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
        />
      </div>
    </form>
  );
};
