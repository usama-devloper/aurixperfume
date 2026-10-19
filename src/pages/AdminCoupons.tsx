import { useState } from "react";
import { useApiAdminCoupons } from "@/hooks/useApiAdmin";
import { createAdminCoupon, CouponItem } from "@/lib/api/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Tag, Plus, RefreshCw, Calendar, Percent } from "lucide-react";
import { format } from "date-fns";

const AdminCoupons = () => {
  const { data: coupons, isLoading, refetch, isFetching } = useApiAdminCoupons();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("0");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !discountValue) return;

    setIsSubmitting(true);
    try {
      await createAdminCoupon({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_order: parseFloat(minOrder || "0"),
        is_active: true,
      });

      toast({
        title: "Coupon created",
        description: `Coupon ${code.toUpperCase()} has been created.`,
      });

      setIsOpen(false);
      setCode("");
      setDiscountValue("");
      setMinOrder("0");
      refetch();
    } catch (err: any) {
      toast({
        title: "Failed to create coupon",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold tracking-tight flex items-center gap-2">
            <Tag className="h-7 w-7 text-primary" />
            Coupons & Discounts
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage promotional codes, percentage discounts, and minimum order values
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Promotional Coupon</DialogTitle>
                <DialogDescription>
                  Create a validated coupon code that customers can apply at checkout.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="code">Coupon Code</Label>
                  <Input
                    id="code"
                    placeholder="e.g. LUXURY20"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Discount Type</Label>
                    <Select
                      value={discountType}
                      onValueChange={(val: any) => setDiscountType(val)}
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="val">
                      {discountType === "percent" ? "Percentage (e.g. 15)" : "Amount (e.g. 500)"}
                    </Label>
                    <Input
                      id="val"
                      type="number"
                      step="any"
                      min="1"
                      placeholder="15"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min">Minimum Order Value (₹)</Label>
                  <Input
                    id="min"
                    type="number"
                    min="0"
                    placeholder="1000"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Save Coupon"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Active & Scheduled Coupons</CardTitle>
          <CardDescription>
            All discounts are validated server-side by the checkout Edge Function.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !coupons || coupons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No coupons created yet. Click "Create Coupon" to add one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min. Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold text-primary">
                      {coupon.code}
                    </TableCell>
                    <TableCell>
                      {coupon.discount_type === "percent"
                        ? `${coupon.discount_value}% off`
                        : `₹${coupon.discount_value} flat`}
                    </TableCell>
                    <TableCell>₹{coupon.min_order}</TableCell>
                    <TableCell>
                      <Badge variant={coupon.is_active ? "default" : "secondary"}>
                        {coupon.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {coupon.valid_until
                        ? format(new Date(coupon.valid_until), "MMM d, yyyy")
                        : "No expiration"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCoupons;
