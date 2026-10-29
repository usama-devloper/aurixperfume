import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle = ({ className = "", showLabel = false }: ThemeToggleProps) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid layout shift and hydration mismatch before client mount
  if (!mounted) {
    return (
      <div 
        className={`w-8 h-8 rounded-full border border-border/80 bg-background/50 flex items-center justify-center shrink-0 ${className}`}
        aria-hidden="true"
      >
        <span className="w-3.5 h-3.5 rounded-full bg-muted/40 animate-pulse" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";
  const targetTheme = isDark ? "light" : "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  const handleToggle = () => {
    setTheme(targetTheme);
  };

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center justify-between w-full py-2.5 px-3 rounded-md text-xs uppercase tracking-wider font-medium text-foreground hover:text-[#C5A880] hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880] ${className}`}
        aria-label={label}
        title={label}
      >
        <span className="text-muted-foreground font-sans text-xs">
          Appearance: <strong className="text-foreground capitalize">{isDark ? "Dark" : "Light"}</strong>
        </span>
        <div className="w-7 h-7 rounded-full border border-border/80 flex items-center justify-center text-foreground hover:text-[#C5A880] hover:border-[#C5A880]/60 transition-colors">
          {isDark ? (
            <Sun className="h-3.5 w-3.5 text-[#C5A880]" />
          ) : (
            <Moon className="h-3.5 w-3.5 text-foreground" />
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`w-8 h-8 rounded-full border border-border/80 bg-background hover:bg-muted/40 text-foreground hover:text-[#C5A880] hover:border-[#C5A880]/60 transition-all flex items-center justify-center shrink-0 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880] ${className}`}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 text-[#C5A880] transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-foreground transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};

export default ThemeToggle;
