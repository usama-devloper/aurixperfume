import { useState, useEffect } from "react";
import { Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRateLimiter } from "@/hooks/useRateLimiter";
import { Clock, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { sanitizeRedirectPath, getSafeOAuthRedirectUrl } from "@/utils/authRedirect";

const Auth = () => {
  const { user, signIn, signUp } = useAuth();
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
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000 // 30 minutes block
  });

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Support deep-linking to a specific tab (e.g. /auth?tab=forgot)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "signin" || tab === "signup" || tab === "forgot") {
      setDefaultTab(tab);
    }
  }, [searchParams]);

  // If Supabase sends recovery tokens (or recovery errors) in the URL hash, always handle it on /reset-password
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

  // Redirect if user is already logged in
  if (user) {
    return <Navigate to={safeRedirect} />;
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
      // Show error with forgot password option for auth errors
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
      // Automatically switch to forgot password tab after showing error
      setTimeout(() => setDefaultTab("forgot"), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form fields
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
      // Clear form
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
        title: "Too many requests",
        description: "You've requested too many reset emails. Please wait 30 minutes before trying again."
      };
    }
    
    if (message.includes("invalid") && message.includes("email")) {
      return {
        title: "Invalid email format",
        description: "Please enter a valid email address."
      };
    }
    
    if (message.includes("not found") || message.includes("no user")) {
      return {
        title: "Email not found",
        description: "If an account exists with this email, you'll receive a reset link shortly."
      };
    }
    
    return {
      title: "Unable to send reset email",
      description: error.message || "Something went wrong. Please try again later."
    };
  };

  const handlePasswordReset = async (e?: React.FormEvent, isResend = false) => {
    e?.preventDefault();
    
    const targetEmail = isResend ? lastSentEmail : email;
    
    if (!targetEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit
    if (!resetRateLimit.isAllowed(targetEmail)) {
      const remainingTime = resetRateLimit.getRemainingTime(targetEmail);
      const minutes = Math.ceil(remainingTime / (1000 * 60));
      
      toast({
        title: "Too many reset attempts",
        description: `Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before requesting another reset email.`,
        variant: "destructive",
      });
      return;
    }

    // Check cooldown for resend
    if (isResend && resendCooldown > 0) {
      toast({
        title: "Please wait",
        description: `You can resend the email in ${resendCooldown} seconds.`,
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
      
      // Record the attempt
      resetRateLimit.recordAttempt(targetEmail);
      
      // Set cooldown (60 seconds)
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
    <div className="container mx-auto max-w-md py-16 px-4">
      <Card className="bg-neutral-900 border-neutral-800 rounded-none text-white shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif tracking-widest uppercase">AURIX</CardTitle>
          <CardDescription className="text-gray-400">Sign in or create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={defaultTab} onValueChange={setDefaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-neutral-800 rounded-none p-1">
              <TabsTrigger value="signin" className="data-[state=active]:bg-perfume-gold data-[state=active]:text-black rounded-none">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-perfume-gold data-[state=active]:text-black rounded-none">Create Account</TabsTrigger>
              <TabsTrigger value="forgot" className="data-[state=active]:bg-perfume-gold data-[state=active]:text-black rounded-none">Reset Password</TabsTrigger>
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
                    <span className="w-full border-t border-neutral-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                    <span className="bg-neutral-900 px-3 text-neutral-500 font-semibold">Or with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your.email@example.com"
                      required
                      className="bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 rounded-none h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 rounded-none h-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-perfume-gold text-black hover:bg-yellow-600 rounded-none uppercase tracking-widest text-xs font-bold h-12 mt-4" 
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <div className="flex flex-col gap-2 mt-4 text-center text-sm">
                    <Button
                      type="button"
                      variant="link"
                      className="text-perfume-gold hover:text-white underline-offset-4 hover:underline h-auto p-0"
                      onClick={() => setDefaultTab("forgot")}
                    >
                      Forgot your password?
                    </Button>
                    <div className="text-gray-400">
                      Don't have an account?{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="text-perfume-gold hover:text-white underline-offset-4 hover:underline h-auto p-0"
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
                    <span className="w-full border-t border-neutral-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                    <span className="bg-neutral-900 px-3 text-neutral-500 font-semibold">Or with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname">First Name</Label>
                      <Input
                        id="signup-firstname"
                        type="text"
                        placeholder="John"
                        required
                        className="bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 rounded-none h-12"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname">Last Name</Label>
                      <Input
                        id="signup-lastname"
                        type="text"
                        placeholder="Doe"
                        required
                        className="bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 rounded-none h-12"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.email@example.com"
                      required
                      className="bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 rounded-none h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 rounded-none h-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">Password must be at least 6 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 rounded-none h-12"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-perfume-gold text-black hover:bg-yellow-600 rounded-none uppercase tracking-widest text-xs font-bold h-12 mt-4" 
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                  <div className="text-center mt-4 text-sm text-gray-400">
                    Already have an account?{" "}
                    <Button
                      type="button"
                      variant="link"
                      className="text-perfume-gold hover:text-white underline-offset-4 hover:underline h-auto p-0"
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
                    <h3 className="text-lg font-semibold">Check your email</h3>
                    <p className="text-sm text-muted-foreground">
                      We've sent a password reset link to <strong>{lastSentEmail || email}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Click the link in the email to reset your password. The link will expire in 1 hour.
                    </p>
                    
                    <div className="bg-neutral-800 rounded-none p-4 text-left space-y-2 mt-4 border border-neutral-700">
                      <p className="text-xs font-medium text-white flex items-center gap-2">
                        <Mail className="w-4 h-4 text-perfume-gold" />
                        Didn't receive the email?
                      </p>
                      <ul className="text-xs text-gray-400 space-y-1 ml-6">
                        <li>• Check your spam or junk folder</li>
                        <li>• Make sure you entered the correct email</li>
                        <li>• Wait a few minutes for the email to arrive</li>
                      </ul>
                    </div>
                    
                    <div className="pt-4 space-y-2">
                      <Button 
                        type="button" 
                        className="w-full bg-perfume-gold text-black hover:bg-yellow-600 rounded-none uppercase tracking-widest text-xs font-bold h-12" 
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
                        className="w-full flex items-center justify-center gap-2"
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
                      
                      {/* Rate limit warning */}
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
                      <h3 className="text-lg font-semibold mb-2">Forgot your password?</h3>
                      <p className="text-sm text-muted-foreground">
                        Enter your email address and we'll send you a link to reset your password.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email address</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="your.email@example.com"
                        required
                        className="bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 rounded-none h-12"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-perfume-gold text-black hover:bg-yellow-600 rounded-none uppercase tracking-widest text-xs font-bold h-12 mt-4" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending reset link..." : "Send Reset Link"}
                    </Button>
                    <div className="text-center mt-4">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-perfume-gold hover:text-white h-auto p-0 transition-colors"
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
        <CardFooter className="text-center text-xs text-gray-500 flex justify-center pb-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
