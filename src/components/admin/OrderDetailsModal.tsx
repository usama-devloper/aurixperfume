import { format } from "date-fns";
import { Order, OrderItem } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, MapPin, Clock, Truck, CreditCard } from "lucide-react";

interface OrderDetailsModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<Order["status"], string> = {
  pending: "bg-warning text-warning-foreground",
  processing: "bg-primary text-primary-foreground",
  shipped: "bg-secondary text-secondary-foreground",
  delivered: "bg-accent text-accent-foreground",
};

const OrderDetailsModal = ({ order, open, onOpenChange }: OrderDetailsModalProps) => {
  const { data: products = [] } = useProducts();

  if (!order) return null;

  const getProductDetails = (productId: number) => {
    return products.find((p) => p.id === productId);
  };

  const statusTimeline = [
    { status: "pending", label: "Order Placed", date: order.created_at },
    { status: "processing", label: "Processing", date: order.status !== "pending" ? order.updated_at : null },
    { status: "shipped", label: "Shipped", date: order.status === "shipped" || order.status === "delivered" ? order.updated_at : null },
    { status: "delivered", label: "Delivered", date: order.status === "delivered" ? order.updated_at : null },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order {order.order_number}</span>
            <Badge className={statusColors[order.status]}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Timeline */}
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              Order Timeline
            </h3>
            <div className="flex items-center justify-between">
              {statusTimeline.map((item, index) => {
                const isCompleted = statusTimeline.findIndex(s => s.status === order.status) >= index;
                return (
                  <div key={item.status} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-xs mt-1 text-center">{item.label}</span>
                    {item.date && isCompleted && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.date), "MMM d")}
                      </span>
                    )}
                    {index < statusTimeline.length - 1 && (
                      <div
                        className={`absolute h-0.5 w-full ${
                          isCompleted ? "bg-primary" : "bg-muted"
                        }`}
                        style={{ left: "50%", top: "16px", width: "100%" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Package className="h-4 w-4" />
              Order Items ({order.items?.length || 0})
            </h3>
            <div className="space-y-3">
              {order.items?.map((item: OrderItem) => {
                const product = getProductDetails(item.product_id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <img
                      src={product?.image || "/placeholder.svg"}
                      alt={product?.name || "Product"}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{product?.name || `Product #${item.product_id}`}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × ₹{item.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-medium">
                      ₹{(item.quantity * item.unit_price).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t">
              <span className="font-medium">Total Amount</span>
              <span className="text-lg font-bold">₹{order.total_amount.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Shipping Address */}
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4" />
              Shipping Address
            </h3>
            {order.shipping_address ? (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{order.shipping_address.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {order.shipping_address.address}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.shipping_address.country}
                </p>
                {order.shipping_address.phone && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Phone: {order.shipping_address.phone}
                  </p>
                )}
                {order.shipping_address.email && (
                  <p className="text-sm text-muted-foreground">
                    Email: {order.shipping_address.email}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No shipping address available</p>
            )}
          </div>

          {/* Payment & Verification Information */}
          <Separator />
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4" />
              Payment & Verification Details
            </h3>
            <div className="p-3 rounded-lg bg-muted/50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Payment Method</span>
                <span className="font-medium uppercase">{order.payment_method === "manual" ? "WhatsApp (Direct)" : (order.payment_method || "N/A")}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Payment Status</span>
                <span className={`font-semibold capitalize ${
                  order.payment_status === "paid" ? "text-green-600" :
                  order.payment_status === "failed" ? "text-destructive" : "text-orange-500"
                }`}>
                  {(order.payment_status || "unpaid").replace(/_/g, " ")}
                </span>
              </div>
              {order.upi_utr && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-xs">UPI Transaction UTR</span>
                  <span className="font-mono bg-background px-2 py-1 rounded border text-xs">{order.upi_utr}</span>
                </div>
              )}
              {order.payment_reference && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-xs">Gateway / Session Reference</span>
                  <span className="font-mono text-xs text-muted-foreground break-all">{order.payment_reference}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tracking Info */}
          {order.tracking_number && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4" />
                  Tracking Information
                </h3>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Tracking Number: </span>
                    <span className="font-medium">{order.tracking_number}</span>
                  </p>
                  {order.estimated_delivery && (
                    <p className="text-sm mt-1">
                      <span className="text-muted-foreground">Estimated Delivery: </span>
                      <span className="font-medium">
                        {format(new Date(order.estimated_delivery), "MMMM d, yyyy")}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Order Dates */}
          <Separator />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Created: {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
            <span>Updated: {format(new Date(order.updated_at), "MMM d, yyyy 'at' h:mm a")}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;
