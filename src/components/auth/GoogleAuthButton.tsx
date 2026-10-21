import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GoogleAuthButtonProps {
  isLoading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  text?: string;
  className?: string;
}

/**
 * Accessible, luxury-styled Google Sign-In button adhering to Aurix Perfume design system.
 * Uses official Google "G" logo SVG colors with luxury neutral background and golden accents.
 */
export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  isLoading = false,
  disabled = false,
  onClick,
  text = "Continue with Google",
  className = "",
}) => {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={text}
      className={`w-full bg-neutral-800/80 hover:bg-neutral-800 text-white border-neutral-700 hover:border-perfume-gold/60 rounded-none h-12 flex items-center justify-center gap-3 transition-all duration-200 uppercase tracking-widest text-xs font-semibold focus-visible:ring-1 focus-visible:ring-perfume-gold disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-perfume-gold" aria-hidden="true" />
          <span>Connecting to Google...</span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          <span>{text}</span>
        </>
      )}
    </Button>
  );
};

export default GoogleAuthButton;
