
import React, { createContext, useContext, useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { logSecurityEvent } from "@/utils/securityLogger";
import { useRateLimiter } from "@/hooks/useRateLimiter";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Security logging is handled via direct utility function to avoid circular dependency
  
  // Rate limiting for auth attempts (5 attempts per 15 minutes)
  const authRateLimit = useRateLimiter({
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000 // 30 minutes block
  });

  useEffect(() => {
    let mounted = true;

    // Helper to check if URL contains an OAuth or token callback
    const hasAuthCallbackInUrl = () => {
      if (typeof window === "undefined") return false;
      const search = window.location.search || "";
      const hash = window.location.hash || "";
      return (
        search.includes("code=") ||
        search.includes("error=") ||
        hash.includes("access_token=") ||
        hash.includes("error=")
      );
    };

    // Check for OAuth error in URL search or hash
    const checkOAuthErrors = () => {
      if (typeof window === "undefined") return;
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        const error = searchParams.get("error") || hashParams.get("error");
        const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");

        if (error || errorDescription) {
          console.warn("[AuthContext] OAuth error received:", error, errorDescription);
          toast({
            title: "Authentication Failed",
            description: errorDescription || "Could not complete sign in with Google. Please try again.",
            variant: "destructive",
          });

          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("error");
          cleanUrl.searchParams.delete("error_description");
          cleanUrl.searchParams.delete("error_code");
          window.history.replaceState(window.history.state, "", cleanUrl.toString());
        }
      } catch (e) {
        // Safe fallback in non-browser or test environments
      }
    };

    checkOAuthErrors();

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // On callback completion (SIGNED_IN) or resolved events, release loading
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "SIGNED_OUT") {
        setLoading(false);

        // Clean code query parameter from URL if present
        if (typeof window !== "undefined" && window.location.search.includes("code=")) {
          try {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("code");
            cleanUrl.searchParams.delete("state");
            window.history.replaceState(window.history.state, "", cleanUrl.toString());
          } catch (e) {
            // Ignore
          }
        }
      } else if (event === "INITIAL_SESSION") {
        // If there is no OAuth callback in flight, INITIAL_SESSION resolves loading immediately.
        // If there IS an OAuth callback in flight, wait for SIGNED_IN event to finish PKCE exchange.
        if (currentSession || !hasAuthCallbackInUrl()) {
          setLoading(false);
        }
      }

      // Password recovery links often land on "/" (/#...) and Supabase immediately cleans the URL.
      // Redirect as soon as Supabase confirms PASSWORD_RECOVERY so users always see /reset-password.
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
        const hash = window.location.hash || "";
        window.location.replace(`/reset-password${hash}`);
        return;
      }

      // Check if user is admin safely without blocking the auth event thread
      if (currentSession?.user) {
        setTimeout(() => {
          if (mounted) checkIfAdmin();
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    // Check for existing session (fast-path for normal page visits)
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;

      if (existingSession) {
        setSession(existingSession);
        setUser(existingSession.user ?? null);
        setTimeout(() => {
          if (mounted) checkIfAdmin();
        }, 0);
        setLoading(false);
      } else if (!hasAuthCallbackInUrl()) {
        // Only mark loading complete if there is no pending OAuth code exchange in the URL
        setLoading(false);
      }
    }).catch((err) => {
      console.warn("[AuthContext] getSession fallback error:", err);
      if (mounted && !hasAuthCallbackInUrl()) {
        setLoading(false);
      }
    });

    // Safety timeout: If OAuth code exchange stalls or hangs indefinitely,
    // guarantee loading state is released so the user is never frozen.
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setLoading((prev) => (prev ? false : prev));
      }
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const checkIfAdmin = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    // Check rate limit
    if (!authRateLimit.isAllowed(email)) {
      const remainingTime = authRateLimit.getRemainingTime(email);
      const minutes = Math.ceil(remainingTime / (1000 * 60));
      
      await logSecurityEvent({
        event_type: 'login_failure',
        email,
        metadata: { reason: 'rate_limited', remaining_time: remainingTime },
        severity: 'medium'
      }).catch(console.warn);
      
      toast({
        title: "Too many attempts",
        description: `Please wait ${minutes} minutes before trying again.`,
        variant: "destructive",
      });
      throw new Error("Rate limit exceeded");
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Record failed attempt
        authRateLimit.recordAttempt(email);
        
        await logSecurityEvent({
          event_type: 'login_failure',
          email,
          metadata: { error: error.message },
          severity: 'medium'
        }).catch(console.warn);
        
        throw error;
      }
      
      // Reset rate limit on successful login
      authRateLimit.reset(email);
      
      await logSecurityEvent({
        event_type: 'login_success',
        email,
        severity: 'low'
      }).catch(console.warn);
      
      toast({
        title: "Sign in successful",
        description: "Welcome back!",
      });
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      // Enhanced password validation
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }
      
      // Check for basic password complexity
      if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
        throw new Error("Password must contain at least one letter and one number");
      }
      
      await logSecurityEvent({
        event_type: 'signup_attempt',
        email,
        severity: 'low'
      }).catch(console.warn);
      
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        await logSecurityEvent({
          event_type: 'signup_attempt',
          email,
          metadata: { error: error.message, success: false },
          severity: 'low'
        }).catch(console.warn);
        throw error;
      }
      
      toast({
        title: "Sign up successful",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      await logSecurityEvent({
        event_type: 'signup_attempt',
        email,
        metadata: { error: error.message, success: false },
        severity: 'low'
      }).catch(console.warn);
      
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Signed out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
