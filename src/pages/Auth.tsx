import { useState, useEffect } from "react";
import { Navigate, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRateLimiter } from "@/hooks/useRateLimiter";
import { Clock, Mail, AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { sanitizeRedirectPath, getSafeOAuthRedirectUrl } from "@/utils/authRedirect";

const Auth = () => {
  const { user, loading: isAuthLoading, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [defaultTab, setDefaultTab] = useState("signin");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [lastSentEmail, setLastSentEmail] = useState("");
  
  const rawRedirect = searchParams.get("redirect");
  const safeRedirect = sanitizeRedirectPath(rawRedirect, "/");

  // Rate limiting for password reset (3 attempts per 15 minutes)
  const resetRateLimit = useRateLimiter({
    maxAttempts: 3,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000
  });

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Support deep-linking to a specific tab
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "signin" || tab === "signup" || tab === "forgot") {
      setDefaultTab(tab);
    }
  }, [searchParams]);

  // If Supabase sends recovery tokens in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const type = hashParams.get("type");
    const errorCode = hashParams.get("error_code") || hashParams.get("error");

    if (type === "recovery" || !!errorCode) {
      navigate(`/reset-password${hash}`, { replace: true });
    }
  }, [navigate]);

  // Handle OAuth query errors (e.g. access_denied when user dismisses consent)
  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    if (error || errorDescription) {
      toast({
        title: "Google Sign-In Error",
        description: errorDescription || "Sign-in could not be completed. Please try again.",
        variant: "destructive",
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("error");
      newParams.delete("error_description");
      newParams.delete("error_code");
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [searchParams, navigate]);

  // Wait for initial session restoration or OAuth code exchange before deciding whether to redirect or show login forms
  const isVerifyingOAuth =
    isAuthLoading ||
    searchParams.has("code") ||
    (typeof window !== "undefined" && window.location.hash.includes("access_token"));

  if (isVerifyingOAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#C5A880]" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Verifying session...</p>
      </div>
    );
  }

  // Redirect if user is already logged in
  if (user) {
    return <Navigate to={safeRedirect} replace />;
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const redirectTo = getSafeOAuthRedirectUrl(rawRedirect);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google Sign-In Error",
        description: error?.message || "Could not initiate Google Sign-In. Please try again.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
      setTimeout(() => setDefaultTab("forgot"), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your first name and last name.",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created successfully",
        description: "Please check your email to verify your account, then sign in.",
      });
      setDefaultTab("signin");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getResetErrorMessage = (error: any): { title: string; description: string } => {
    const message = error?.message?.toLowerCase() || "";
    
    if (message.includes("rate limit") || message.includes("too many")) {
      return {
        title: "Rate limit exceeded",
        description: "Too many reset attempts. Please wait 15 minutes before trying again.",
      };
    }
    
    return {
      title: "Password reset failed",
      description: error.message || "Failed to send reset link. Please try again.",
    };
  };

  const handlePasswordReset = async (e?: React.FormEvent, isResend = false) => {
    if (e) e.preventDefault();
    
    const targetEmail = isResend ? lastSentEmail : email;
    
    if (!targetEmail || !targetEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    if (!resetRateLimit.isAllowed(targetEmail)) {
      const remainingMinutes = Math.ceil(resetRateLimit.getRemainingTime(targetEmail) / (1000 * 60));
      toast({
        title: "Too many attempts",
        description: `Please wait ${remainingMinutes} minute(s) before requesting another reset link.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      resetRateLimit.recordAttempt(targetEmail);
      setResendCooldown(60);
      setLastSentEmail(targetEmail);
      setResetSent(true);
      
      toast({
        title: isResend ? "Email resent" : "Reset link sent",
        description: `Check your email at ${targetEmail} for the reset link.`,
      });
    } catch (error: any) {
      const errorMessage = getResetErrorMessage(error);
      toast({
        title: errorMessage.title,
        description: errorMessage.description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = () => {
    handlePasswordReset(undefined, true);
  };

  return (
    <div className="container mx-auto max-w-lg py-16 px-4">
      <Card className="bg-card border border-border rounded-xl text-foreground shadow-lg">
        <CardHeader className="text-center pb-6">
          <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-1 block">
            Maison Account
          </span>
          <CardTitle className="text-3xl font-serif tracking-[0.2em] uppercase text-foreground">AURIX</CardTitle>
          <CardDescription className="text-muted-foreground text-xs mt-1">
            Access your orders, bespoke wishlist, and fragrance profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={defaultTab} onValueChange={setDefaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/60 border border-border rounded-lg p-1">
              <TabsTrigger value="signin" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md text-xs font-medium py-2">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md text-xs font-medium py-2">Create Account</TabsTrigger>
              <TabsTrigger value="forgot" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md text-xs font-medium py-2">Reset Password</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <div className="space-y-4">
                <GoogleAuthButton
                  onClick={handleGoogleSignIn}
                  isLoading={isGoogleLoading}
                  disabled={isLoading}
                  text="Continue with Google"
                />

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/80" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                    <span className="bg-card px-3 text-muted-foreground font-semibold">Or with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your.email@example.com"
                      required
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md h-11 text-sm focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md h-11 text-sm focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full btn-gold h-11 text-xs uppercase tracking-wider font-semibold mt-4 shadow-sm" 
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <div className="flex flex-col gap-2 mt-4 text-center text-xs">
                    <Button
                      type="button"
                      variant="link"
                      className="text-[#C5A880] hover:text-foreground underline-offset-4 hover:underline h-auto p-0"
                      onClick={() => setDefaultTab("forgot")}
                    >
                      Forgot your password?
                    </Button>
                    <div className="text-muted-foreground">
                      Don't have an account?{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="text-[#C5A880] hover:text-foreground underline-offset-4 hover:underline h-auto p-0 font-semibold"
                        onClick={() => setDefaultTab("signup")}
                      >
                        Create account
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4">
                <GoogleAuthButton
                  onClick={handleGoogleSignIn}
                  isLoading={isGoogleLoading}
                  disabled={isLoading}
                  text="Continue with Google"
                />

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/80" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                    <span className="bg-card px-3 text-muted-foreground font-semibold">Or with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">First Name</Label>
                      <Input
                        id="signup-firstname"
                        type="text"
                        placeholder="John"
                        required
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md h-11 text-sm focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Last Name</Label>
                      <Input
                        id="signup-lastname"
                        type="text"
                        placeholder="Doe"
                        required
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md h-11 text-sm focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.email@example.com"
                      required
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md h-11 text-sm focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md h-11 text-sm focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">Password must be at least 6 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md h-11 text-sm focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full btn-gold h-11 text-xs uppercase tracking-wider font-semibold mt-4 shadow-sm" 
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                  <div className="text-center mt-4 text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <Button
                      type="button"
                      variant="link"
                      className="text-[#C5A880] hover:text-foreground underline-offset-4 hover:underline h-auto p-0 font-semibold"
                      onClick={() => setDefaultTab("signin")}
                    >
                      Sign in
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="forgot">
              <form onSubmit={(e) => handlePasswordReset(e, false)} className="space-y-4">
                {resetSent ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-serif text-lg font-medium">Check your email</h3>
                    <p className="text-xs text-muted-foreground">
                      We've sent a password reset link to <strong className="text-foreground">{lastSentEmail || email}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click the link in the email to reset your password. The link will expire in 1 hour.
                    </p>
                    
                    <div className="bg-muted/40 rounded-lg p-4 text-left space-y-2 mt-4 border border-border">
                      <p className="text-xs font-medium text-foreground flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#C5A880]" />
                        Didn't receive the email?
                      </p>
                      <ul className="text-[11px] text-muted-foreground space-y-1 ml-6">
                        <li>• Check your spam or junk folder</li>
                        <li>• Make sure you entered the correct email</li>
                        <li>• Wait a few minutes for the email to arrive</li>
                      </ul>
                    </div>
                    
                    <div className="pt-4 space-y-2">
                      <Button 
                        type="button" 
                        className="w-full btn-gold h-11 text-xs uppercase tracking-wider font-semibold" 
                        onClick={() => {
                          setResetSent(false);
                          setDefaultTab("signin");
                        }}
                      >
                        Back to Sign In
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full flex items-center justify-center gap-2 text-xs"
                        onClick={handleResendEmail}
                        disabled={resendCooldown > 0 || isLoading}
                      >
                        {isLoading ? (
                          "Sending..."
                        ) : resendCooldown > 0 ? (
                          <>
                            <Clock className="w-4 h-4" />
                            Resend in {resendCooldown}s
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            Resend email
                          </>
                        )}
                      </Button>
                      
                      {!resetRateLimit.isAllowed(lastSentEmail || email) && (
                        <div className="flex items-center gap-2 text-xs text-destructive mt-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>
                            Too many attempts. Please wait {Math.ceil(resetRateLimit.getRemainingTime(lastSentEmail || email) / (1000 * 60))} minutes.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <h3 className="font-serif text-lg font-medium mb-1">Forgot your password?</h3>
                      <p className="text-xs text-muted-foreground">
                        Enter your email address and we'll send you a link to reset your password.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email address</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="your.email@example.com"
                        required
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md h-11 text-sm focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880]"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full btn-gold h-11 text-xs uppercase tracking-wider font-semibold mt-4 shadow-sm" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending reset link..." : "Send Reset Link"}
                    </Button>
                    <div className="text-center mt-4">
                      <Button
                        type="button"
                        variant="link"
                        className="text-xs text-[#C5A880] hover:text-foreground h-auto p-0 transition-colors"
                        onClick={() => setDefaultTab("signin")}
                      >
                        ← Back to Sign In
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-center text-[11px] text-muted-foreground flex justify-center pb-6">
          <span>
            By continuing, you agree to our{" "}
            <Link to="/terms" className="text-[#C5A880] hover:underline font-medium">Terms of Service</Link>
            {" "}and{" "}
            <Link to="/privacy-policy" className="text-[#C5A880] hover:underline font-medium">Privacy Policy</Link>.
          </span>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
