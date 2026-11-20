import { useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Upload, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Loader2,
  Clock,
  RotateCcw
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRateLimiter } from "@/hooks/useRateLimiter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type RequestType =
  | "return_sealed"
  | "damaged"
  | "leaking"
  | "wrong_item"
  | "defective"
  | "other";

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  return_sealed: "Return — Factory Sealed / Unopened Flacon",
  damaged: "Damaged Package / Broken Flacon",
  leaking: "Leaking Bottle / Cap Defect",
  wrong_item: "Wrong Product / Olfactive Family Received",
  defective: "Defective Atomizer / Spray Mechanism",
  other: "Other Order Inconsistency",
};

interface SubmissionResult {
  referenceNumber: string;
  orderNumber: string;
  requestType: RequestType;
  productName: string;
  email: string;
}

const ReturnRequest = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  // Client-side rate limiter as defensive pre-check (3 requests per 1 hour)
  const submitRateLimit = useRateLimiter({
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: 60 * 60 * 1000,
  });

  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") || "");
  const [email, setEmail] = useState(user?.email || "");
  const [customerName, setCustomerName] = useState(user?.user_metadata?.full_name || "");
  const [requestType, setRequestType] = useState<RequestType>("return_sealed");
  const [productName, setProductName] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);

    const validFiles: File[] = [];
    for (const f of selected) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        toast({
          title: "Unsupported File Format",
          description: `${f.name} is not a supported image format. Allowed: JPG, PNG, WebP only.`,
          variant: "destructive",
        });
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast({
          title: "File Exceeds 5MB",
          description: `${f.name} is too large. Maximum size is 5MB per image.`,
          variant: "destructive",
        });
        continue;
      }
      validFiles.push(f);
    }
    setPhotoFiles((prev) => [...prev, ...validFiles].slice(0, 3));
  };

  const removeFile = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmissionError(null);

    const cleanOrder = orderNumber.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = customerName.trim();
    const cleanProduct = productName.trim();
    const cleanReason = reason.trim();
    const cleanDesc = description.trim();

    // 1. Client-Side Input Validation
    if (!cleanOrder || cleanOrder.length < 3 || cleanOrder.length > 64 || !/^[A-Za-z0-9\-_]+$/.test(cleanOrder)) {
      setSubmissionError("Please enter a valid AURIX order reference number (e.g. ORD-2026...).");
      toast({
        title: "Order Number Required",
        description: "Please enter a valid order reference number.",
        variant: "destructive",
      });
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setSubmissionError("Please provide a valid customer correspondence email address.");
      toast({
        title: "Valid Email Required",
        description: "Please enter a valid customer email address.",
        variant: "destructive",
      });
      return;
    }

    if (!cleanProduct) {
      setSubmissionError("Please specify the fragrance creation or product name.");
      toast({
        title: "Product Name Required",
        description: "Please specify the fragrance creation name.",
        variant: "destructive",
      });
      return;
    }

    if (!cleanReason) {
      setSubmissionError("Please provide a brief summary of the issue.");
      toast({
        title: "Reason Required",
        description: "Please provide a reason summary for your request.",
        variant: "destructive",
      });
      return;
    }

    if (!cleanDesc || cleanDesc.length < 10) {
      setSubmissionError("Please provide at least 10 characters detailing the request.");
      toast({
        title: "Detailed Description Required",
        description: "Please provide a description of at least 10 characters.",
        variant: "destructive",
      });
      return;
    }

    // 2. Client-Side Defensive Rate-Limiting Check
    if (!submitRateLimit.isAllowed(cleanEmail)) {
      const rateLimitMsg = "Submission limit reached (3 requests per hour). For security, please wait before submitting another request or contact our atelier directly.";
      setSubmissionError(rateLimitMsg);
      toast({
        title: "Rate Limit Exceeded",
        description: rateLimitMsg,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 3. Task 1: Server-Authoritative Reference Reservation
      // Validates order & customer ownership and acquires an authoritative reference BEFORE evidence upload
      const { data: reserveData, error: reserveError } = await supabase.rpc("reserve_return_reference", {
        p_order_number: cleanOrder,
        p_customer_email: cleanEmail,
      });

      if (reserveError) {
        console.error("Reservation RPC error:", reserveError);
        const failureMsg = "Unable to initialize return inquiry. Please check your order details or contact our concierge directly at aurixperfume25@gmail.com.";
        setSubmissionError(failureMsg);
        toast({
          title: "Verification Failed",
          description: failureMsg,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const reserveRes = typeof reserveData === "string" ? JSON.parse(reserveData) : reserveData;
      if (!reserveRes?.success || !reserveRes?.reference_number) {
        const errorMsg = reserveRes?.error || "Unable to verify order with provided details.";
        setSubmissionError(errorMsg);
        toast({
          title: "Verification Failed",
          description: errorMsg,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const officialRef = reserveRes.reference_number;
      const reservationToken = reserveRes.reservation_token || null;

      // 4. Upload evidence into the reserved reference folder (guaranteeing exact path match with server)
      const photoPaths: string[] = [];
      for (const file of photoFiles) {
        try {
          const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const storagePath = `${officialRef}/${Date.now()}-${sanitizedFilename}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("return-requests")
            .upload(storagePath, file, {
              contentType: file.type,
              upsert: false,
            });

          if (!uploadErr && uploadData?.path) {
            photoPaths.push(uploadData.path);
          }
        } catch (uploadErr) {
          console.warn("Private storage upload note:", uploadErr);
        }
      }

      // 5. Final Authoritative Submission: Reconciles reservation, validates photo paths, and inserts request
      const { data: rpcData, error: rpcError } = await supabase.rpc("submit_return_request", {
        p_order_number: cleanOrder,
        p_customer_email: cleanEmail,
        p_customer_name: cleanName || null,
        p_request_type: requestType,
        p_product_name: cleanProduct,
        p_reason: cleanReason,
        p_description: cleanDesc,
        p_photo_paths: photoPaths,
        p_reference_number: officialRef,
        p_reservation_token: reservationToken,
      });

      if (rpcError) {
        console.error("RPC submission failure:", rpcError);
        const failureMsg = "Unable to record your return request to the database. Please check your connection and retry, or contact our concierge directly at aurixperfume25@gmail.com.";
        setSubmissionError(failureMsg);
        toast({
          title: "Submission Failed",
          description: failureMsg,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const res = typeof rpcData === "string" ? JSON.parse(rpcData) : rpcData;
      if (!res?.success) {
        // Controlled rejection from server RPC (e.g. RATE_LIMITED, INVALID_PHOTO_ATTACHMENTS, RESERVATION_EXPIRED)
        const errorMsg = res?.error || "Unable to verify order with provided details.";
        setSubmissionError(errorMsg);
        toast({
          title: "Submission Notice",
          description: errorMsg,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const verifiedRef = res.reference_number || officialRef;

      // 6. Confirmed Persistence: Record rate-limit attempt & dispatch notification
      submitRateLimit.recordAttempt(cleanEmail);

      // Trigger asynchronous email notification (fire-and-forget) with server-issued reservation token
      if (reservationToken) {
        try {
          supabase.functions.invoke("return-request-notify", {
            body: {
              event: "REQUEST_CREATED",
              reference_number: verifiedRef,
              order_number: cleanOrder,
              customer_email: cleanEmail,
              reservation_token: reservationToken,
              customer_name: cleanName || null,
              product_name: cleanProduct,
              request_type: requestType,
              status: "pending",
            },
          }).catch(() => {});
        } catch {}
      }

      // 7. Advance to verified success screen with confirmed server reference
      setSubmissionResult({
        referenceNumber: verifiedRef,
        orderNumber: cleanOrder,
        requestType,
        productName: cleanProduct,
        email: cleanEmail,
      });

      toast({
        title: "Request Successfully Registered",
        description: `Your verified reference is ${verifiedRef}. Our atelier concierge will review it.`,
      });
    } catch (err: any) {
      console.error("Unexpected submission failure:", err);
      const errMsg = err?.message || "An unexpected error occurred. Your request was not recorded. Please retry.";
      setSubmissionError(errMsg);
      toast({
        title: "Submission Error",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForRetry = () => {
    setSubmissionError(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Header */}
      <section className="py-16 lg:py-20 text-center border-b border-border/80 bg-[#F7F4EE] dark:bg-[#141211]">
        <div className="container mx-auto px-4 max-w-3xl">
          <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
            Client Sanctuary & Resolution
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium text-foreground tracking-tight mb-4">
            Return & Issue Request
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            We are dedicated to your utmost satisfaction. Submit your order details below for individualized concierge review.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-16 container mx-auto px-4 lg:px-8 max-w-3xl">
        {submissionResult ? (
          /* Acknowledgment Screen (Only shown upon confirmed database persistence) */
          <Card className="bg-card border-border shadow-md rounded-xl overflow-hidden p-6 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-1 block">
              Official Acknowledgment
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-3">
              Request Successfully Registered
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
              Your inquiry has been placed into our concierge review queue. An atelier specialist will examine your report against our verified fulfillment logs.
            </p>

            <div className="bg-muted/50 p-6 rounded-lg border border-border/80 text-left text-xs space-y-3 mb-8">
              <div className="flex justify-between items-center border-b border-border/60 pb-2">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">Reference Code:</span>
                <span className="font-mono font-bold text-foreground text-sm text-[#C5A880]">{submissionResult.referenceNumber}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/60 pb-2">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">Order Reference:</span>
                <span className="font-mono font-semibold text-foreground">{submissionResult.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/60 pb-2">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">Request Category:</span>
                <span className="font-semibold text-foreground">{REQUEST_TYPE_LABELS[submissionResult.requestType]}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/60 pb-2">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">Affected Creation:</span>
                <span className="font-semibold text-foreground">{submissionResult.productName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">Correspondence Email:</span>
                <span className="font-semibold text-foreground">{submissionResult.email}</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-2 mb-8 text-left bg-card p-4 rounded-lg border border-border/70">
              <h3 className="font-serif font-semibold text-foreground text-sm">Next Steps:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Please retain your Reference Code for all correspondence.</li>
                <li>Our client care team will inspect your details and reach out via email within 1–2 business days.</li>
                <li>If physical return of a factory-sealed flacon is approved, safe return transit instructions will be provided.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="btn-gold text-xs uppercase tracking-wider font-semibold">
                <Link to="/order-tracking">Track Order Status</Link>
              </Button>
              <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted text-xs uppercase tracking-wider font-semibold">
                <Link to="/">Return to Maison</Link>
              </Button>
            </div>
          </Card>
        ) : (
          /* Request Form */
          <div className="space-y-8">
            {/* Policy Framework Notice */}
            <div className="p-5 rounded-xl border border-[#C5A880]/40 bg-[#C5A880]/10 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold font-serif text-sm">
                <ShieldAlert className="w-4 h-4 text-[#C5A880] shrink-0" />
                <span>Atelier Return & Resolution Charter</span>
              </div>
              <p className="leading-relaxed">
                Fine perfumes are intimate botanical formulations. Unopened and factory-sealed creations in original packaging are eligible for return review. For transit damage, leakage, or incorrect shipments, our concierge arranges expedited resolutions. Every request is reviewed individually.
              </p>
            </div>

            {/* Error Banner with Retry */}
            {submissionError && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Submission Notice</AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  {submissionError}
                </AlertDescription>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetForRetry}
                    className="text-xs border-destructive/40 hover:bg-destructive/20 h-7"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Dismiss & Retry
                  </Button>
                </div>
              </Alert>
            )}

            <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="font-serif text-xl sm:text-2xl text-foreground">
                  Submit Resolution Request
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Fields marked with an asterisk (*) are required to verify order records.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Order Number & Email */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="orderNumber" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Order Number *
                      </Label>
                      <Input
                        id="orderNumber"
                        placeholder="e.g. ORD-2026..."
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        required
                        className="bg-card border-border text-xs h-10 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Registered Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-card border-border text-xs h-10"
                      />
                    </div>
                  </div>

                  {/* Customer Name & Request Type */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="customerName" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Client Name
                      </Label>
                      <Input
                        id="customerName"
                        placeholder="Your full name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="bg-card border-border text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="requestType" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Request Category *
                      </Label>
                      <Select
                        value={requestType}
                        onValueChange={(val) => setRequestType(val as RequestType)}
                      >
                        <SelectTrigger id="requestType" className="bg-card border-border text-xs h-10">
                          <SelectValue placeholder="Select request category" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-xs">
                          {Object.entries(REQUEST_TYPE_LABELS).map(([k, label]) => (
                            <SelectItem key={k} value={k} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Product Name & Reason */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="productName" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Product / Flacon Name *
                      </Label>
                      <Input
                        id="productName"
                        placeholder="e.g. Sovereign Oud (50ml)"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                        className="bg-card border-border text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reason" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Primary Reason Summary *
                      </Label>
                      <Input
                        id="reason"
                        placeholder="e.g. Unopened return, leaking cap, broken bottle"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                        className="bg-card border-border text-xs h-10"
                      />
                    </div>
                  </div>

                  {/* Detailed Description */}
                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Detailed Narrative & Circumstances *
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Please describe the condition of the package, seal status, or defect in detail..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      required
                      className="bg-card border-border text-xs leading-relaxed"
                    />
                  </div>

                  {/* Photo Upload (Private Bucket) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Supporting Photographs (Private & Confidential)
                    </Label>
                    <div className="border border-dashed border-border rounded-lg p-5 text-center bg-muted/20">
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-70" />
                      <p className="text-xs text-muted-foreground mb-1">
                        Upload up to 3 clear photos (JPG, PNG, WebP — max 5MB each). Evidence is stored securely in private atelier storage.
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleFileChange}
                        disabled={photoFiles.length >= 3}
                        className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#C5A880]/20 file:text-[#C5A880] hover:file:bg-[#C5A880]/30 cursor-pointer"
                      />
                      {photoFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center mt-3 pt-3 border-t border-border/60">
                          {photoFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-card border border-border px-2.5 py-1 rounded text-[11px]">
                              <span className="truncate max-w-[150px]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => removeFile(idx)}
                                className="text-destructive font-bold ml-1 hover:opacity-80"
                                aria-label="Remove photo"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-gold h-11 text-xs uppercase tracking-wider font-semibold shadow-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying Order & Lodging Request...
                        </>
                      ) : (
                        "Submit Request for Atelier Review"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="text-center pt-4">
              <Button asChild variant="ghost" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground">
                <Link to="/" className="inline-flex items-center gap-2">
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Maison
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ReturnRequest;
