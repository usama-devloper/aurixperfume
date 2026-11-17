import { useState, useEffect, useMemo, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { 
  Loader2, 
  RefreshCw, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  ExternalLink,
  ImageIcon
} from "lucide-react";

export interface ReturnRequestItem {
  id: string;
  reference_number: string;
  order_number: string;
  customer_email: string;
  customer_name?: string | null;
  request_type: string;
  product_name: string;
  reason: string;
  description: string;
  photo_urls?: string[];
  status: "pending" | "under_review" | "approved" | "rejected" | "resolved";
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  pending: { label: "Pending", variant: "outline", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  under_review: { label: "Under Review", variant: "secondary", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  approved: { label: "Approved", variant: "default", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  rejected: { label: "Rejected", variant: "destructive", className: "bg-red-500/10 text-red-600 border-red-500/30" },
  resolved: { label: "Resolved", variant: "default", className: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
};

const REQUEST_TYPE_NAMES: Record<string, string> = {
  return_sealed: "Sealed Flacon Return",
  damaged: "Damaged Package / Broken",
  leaking: "Leaking / Cap Defect",
  wrong_item: "Wrong Item Delivered",
  defective: "Defective Atomizer",
  other: "Other Inconsistency",
};

const AdminReturnRequests = () => {
  const { user, isAdmin, loading } = useAuth();

  const [requests, setRequests] = useState<ReturnRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selectedRequest, setSelectedRequest] = useState<ReturnRequestItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<string[]>([]);
  const [isGeneratingUrls, setIsGeneratingUrls] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from("order_return_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Handle case where table is not yet created in remote database
        console.warn("Notice: order_return_requests fetch notice:", error.message);
        setRequests([]);
      } else if (data) {
        setRequests(data as ReturnRequestItem[]);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast({
        title: "Notice",
        description: "Unable to retrieve return requests.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin, fetchRequests]);

  const handleOpenReview = async (item: ReturnRequestItem) => {
    setSelectedRequest(item);
    setAdminNotes(item.admin_notes || "");
    setSignedPhotoUrls([]);
    setIsDialogOpen(true);

    // Generate secure temporary signed URLs for private photo storage
    if (item.photo_urls && item.photo_urls.length > 0) {
      setIsGeneratingUrls(true);
      const urls: string[] = [];
      for (const path of item.photo_urls) {
        try {
          // Strictly validate that path is a safe relative storage path belonging to return-requests
          if (typeof path === "string" && !path.includes("..") && !path.startsWith("http://") && !path.startsWith("https://")) {
            const { data } = await supabase.storage
              .from("return-requests")
              .createSignedUrl(path, 3600); // 1-hour expiration
            if (data?.signedUrl) {
              urls.push(data.signedUrl);
            }
          }
        } catch (err) {
          console.warn("Signed URL generation skipped:", err);
        }
      }
      setSignedPhotoUrls(urls);
      setIsGeneratingUrls(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "pending" | "under_review" | "approved" | "rejected" | "resolved") => {
    if (!selectedRequest) return;
    setIsUpdating(true);

    try {
      const updatedNotes = adminNotes.trim() || null;
      const { error } = await supabase
        .from("order_return_requests")
        .update({
          status: newStatus,
          admin_notes: updatedNotes,
          updated_at: new Date().toISOString(),
          ...(newStatus === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
        })
        .eq("id", selectedRequest.id);

      if (error) {
        throw new Error(error.message);
      }

      // Asynchronously trigger notification
      try {
        supabase.functions.invoke("return-request-notify", {
          body: {
            event: "STATUS_UPDATED",
            reference_number: selectedRequest.reference_number,
            order_number: selectedRequest.order_number,
            customer_email: selectedRequest.customer_email,
            customer_name: selectedRequest.customer_name,
            status: newStatus,
            admin_notes: updatedNotes,
          },
        }).catch(() => {});
      } catch {}

      toast({
        title: "Request updated",
        description: `Reference ${selectedRequest.reference_number} marked as ${newStatus.replace("_", " ")}.`,
      });

      // Update local state
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id
            ? { ...r, status: newStatus, admin_notes: updatedNotes, updated_at: new Date().toISOString() }
            : r
        )
      );

      setSelectedRequest((prev) =>
        prev ? { ...prev, status: newStatus, admin_notes: updatedNotes } : null
      );
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message || "Could not update request status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        r.reference_number.toLowerCase().includes(q) ||
        r.order_number.toLowerCase().includes(q) ||
        r.customer_email.toLowerCase().includes(q) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
        r.product_name.toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [requests, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const underReview = requests.filter((r) => r.status === "under_review").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const resolved = requests.filter((r) => r.status === "resolved").length;
    return { total, pending, underReview, approved, resolved };
  }, [requests]);

  if (loading) {
    return (
      <div className="container mx-auto py-16 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth?redirect=/admin/returns" />;
  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold tracking-tight text-foreground">
            Returns & Client Inquiries
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review customer returns, sealed flacon inspections, and transit dispute claims.
          </p>
        </div>
        <Button
          onClick={fetchRequests}
          variant="outline"
          size="sm"
          disabled={isFetching}
          className="self-start sm:self-auto text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh Requests
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Pending Claims</CardDescription>
            <CardTitle className="text-2xl font-semibold text-amber-600">{counts.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Under Review</CardDescription>
            <CardTitle className="text-2xl font-semibold text-blue-600">{counts.underReview}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Approved Returns</CardDescription>
            <CardTitle className="text-2xl font-semibold text-green-600">{counts.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Resolved Inquiries</CardDescription>
            <CardTitle className="text-2xl font-semibold text-purple-600">{counts.resolved}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reference, order, email, product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Statuses ({counts.total})</SelectItem>
                  <SelectItem value="pending">Pending ({counts.pending})</SelectItem>
                  <SelectItem value="under_review">Under Review ({counts.underReview})</SelectItem>
                  <SelectItem value="approved">Approved ({counts.approved})</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="resolved">Resolved ({counts.resolved})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="bg-card border-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-40 text-[#C5A880]" />
              No return or issue requests found matching criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Reference</TableHead>
                  <TableHead className="text-xs font-semibold">Order</TableHead>
                  <TableHead className="text-xs font-semibold">Client</TableHead>
                  <TableHead className="text-xs font-semibold">Category</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => {
                  const badge = STATUS_BADGES[req.status] || STATUS_BADGES.pending;
                  return (
                    <TableRow key={req.id} className="border-border hover:bg-muted/50 text-xs">
                      <TableCell className="font-mono font-medium text-[#C5A880]">
                        {req.reference_number}
                      </TableCell>
                      <TableCell className="font-mono">{req.order_number}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{req.customer_name || "Guest"}</div>
                        <div className="text-[11px] text-muted-foreground">{req.customer_email}</div>
                      </TableCell>
                      <TableCell>{REQUEST_TYPE_NAMES[req.request_type] || req.request_type}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant} className={`text-[10px] ${badge.className || ""}`}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenReview(req)}
                          className="h-8 px-2 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-[#C5A880]" />
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inspection & Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={STATUS_BADGES[selectedRequest.status]?.variant} className={STATUS_BADGES[selectedRequest.status]?.className}>
                    {STATUS_BADGES[selectedRequest.status]?.label}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    Ref: {selectedRequest.reference_number}
                  </span>
                </div>
                <DialogTitle className="font-serif text-xl">
                  {REQUEST_TYPE_NAMES[selectedRequest.request_type] || selectedRequest.request_type}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Submitted for Order <strong>{selectedRequest.order_number}</strong> on{" "}
                  {new Date(selectedRequest.created_at).toLocaleString("en-IN")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                {/* Client & Product Summary */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border border-border">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Client</span>
                    <span className="font-medium">{selectedRequest.customer_name || "Guest Customer"}</span>
                    <span className="block text-muted-foreground">{selectedRequest.customer_email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Creation / Product</span>
                    <span className="font-medium">{selectedRequest.product_name}</span>
                    <span className="block text-muted-foreground italic">Reason: {selectedRequest.reason}</span>
                  </div>
                </div>

                {/* Narrative Description */}
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Customer Circumstances & Description
                  </Label>
                  <div className="p-3 bg-card border border-border rounded-lg text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedRequest.description}
                  </div>
                </div>

                {/* Evidence Photos (Private Signed URLs) */}
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Customer Photo Evidence
                  </Label>
                  {isGeneratingUrls ? (
                    <div className="p-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C5A880]" />
                      Generating secure time-limited access tokens...
                    </div>
                  ) : signedPhotoUrls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {signedPhotoUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block aspect-square rounded-md overflow-hidden border border-border bg-muted/20"
                        >
                          <img
                            src={url}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/20 rounded border border-border text-muted-foreground text-[11px] flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 opacity-50" />
                      No photographic attachments provided with this request.
                    </div>
                  )}
                </div>

                {/* Internal Admin Notes */}
                <div>
                  <Label htmlFor="adminNotes" className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Internal Concierge Notes & Resolution Terms
                  </Label>
                  <Textarea
                    id="adminNotes"
                    placeholder="Document batch inspection, return tracking number, or resolution reasoning..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Status Action Buttons */}
              <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus("under_review")}
                  className="text-xs text-blue-600 border-blue-500/30 hover:bg-blue-500/10"
                >
                  Mark Under Review
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus("approved")}
                  className="text-xs text-green-600 border-green-500/30 hover:bg-green-500/10"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Approve Claim
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus("rejected")}
                  className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Reject Claim
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus("resolved")}
                  className="btn-gold text-xs font-semibold"
                >
                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Resolve Inquiry
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReturnRequests;

