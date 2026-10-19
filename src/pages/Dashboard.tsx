import { useState } from "react";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useOrders, Order } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, PackageSearch, TruckIcon, CheckCircle, CalendarIcon, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";
import OrderDetailsModal from "@/components/admin/OrderDetailsModal";

const SHIPPING_CARRIERS = [
  { value: "fedex", label: "FedEx" },
  { value: "ups", label: "UPS" },
  { value: "usps", label: "USPS" },
  { value: "dhl", label: "DHL" },
  { value: "bluedart", label: "Blue Dart" },
  { value: "dtdc", label: "DTDC" },
  { value: "delhivery", label: "Delhivery" },
  { value: "other", label: "Other" },
];

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { orders, loading, updateOrderStatus, updateTrackingInfo, bulkUpdateOrders } = useOrders();
  const [editingTrackingId, setEditingTrackingId] = useState<string | null>(null);
  const [tempTrackingNumber, setTempTrackingNumber] = useState("");
  const [tempCarrier, setTempCarrier] = useState<string>("");
  const [tempEstimatedDelivery, setTempEstimatedDelivery] = useState<Date | undefined>(undefined);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Bulk selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<Order["status"] | "">("");
  const [bulkCarrier, setBulkCarrier] = useState("");
  const [bulkTrackingNumber, setBulkTrackingNumber] = useState("");
  const [bulkEstimatedDelivery, setBulkEstimatedDelivery] = useState<Date | undefined>(undefined);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  
  // Redirect if user is not logged in or not an admin
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  const applyFilters = (orderList: Order[]) => {
    return orderList.filter(order => {
      // Payment filter
      if (paymentFilter !== "all" && (order.payment_status || "unpaid") !== paymentFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const orderNum = (order.order_number || "").toLowerCase();
        const customer = (order.shipping_address?.full_name || "").toLowerCase();
        const utr = (order.upi_utr || "").toLowerCase();
        const tracking = (order.tracking_number || "").toLowerCase();
        const matches = orderNum.includes(query) || customer.includes(query) || utr.includes(query) || tracking.includes(query);
        if (!matches) return false;
      }
      return true;
    });
  };

  const filterOrdersByStatus = (status: Order["status"]) => {
    return applyFilters(orders.filter(order => order.status === status));
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order["status"]) => {
    await updateOrderStatus(orderId, newStatus);
  };

  const handleTrackingSubmit = async (orderId: string) => {
    if (!tempTrackingNumber.trim() || !tempCarrier) return;
    const estimatedDeliveryStr = tempEstimatedDelivery 
      ? tempEstimatedDelivery.toISOString() 
      : null;
    await updateTrackingInfo(orderId, tempTrackingNumber, tempCarrier, estimatedDeliveryStr);
    setEditingTrackingId(null);
    setTempTrackingNumber("");
    setTempCarrier("");
    setTempEstimatedDelivery(undefined);
  };

  // Bulk selection handlers
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = (filteredOrders: Order[]) => {
    const allIds = filteredOrders.map(o => o.id);
    const allSelected = allIds.every(id => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const clearSelection = () => {
    setSelectedOrderIds([]);
    setBulkStatus("");
    setBulkCarrier("");
    setBulkTrackingNumber("");
    setBulkEstimatedDelivery(undefined);
  };

  const handleBulkUpdate = async () => {
    if (selectedOrderIds.length === 0) return;

    const updates: any = {};
    if (bulkStatus) updates.status = bulkStatus;
    if (bulkCarrier) updates.shipping_carrier = bulkCarrier;
    if (bulkTrackingNumber) updates.tracking_number = bulkTrackingNumber;
    if (bulkEstimatedDelivery) updates.estimated_delivery = bulkEstimatedDelivery.toISOString();

    if (Object.keys(updates).length === 0) return;

    setIsBulkUpdating(true);
    const success = await bulkUpdateOrders(selectedOrderIds, updates);
    setIsBulkUpdating(false);

    if (success) {
      clearSelection();
    }
  };

  const renderOrdersTable = (filteredOrders: Order[]) => {
    const allIds = filteredOrders.map(o => o.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedOrderIds.includes(id));
    const someSelected = allIds.some(id => selectedOrderIds.includes(id));
    
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => toggleSelectAll(filteredOrders)}
                  aria-label="Select all orders"
                  className={someSelected && !allSelected ? "opacity-50" : ""}
                />
              </TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tracking #</TableHead>
              <TableHead className="w-[60px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map(order => (
              <TableRow 
                key={order.id}
                className={cn(selectedOrderIds.includes(order.id) && "bg-primary/5")}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedOrderIds.includes(order.id)}
                    onCheckedChange={() => toggleOrderSelection(order.id)}
                    aria-label={`Select order ${order.order_number}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{order.order_number}</TableCell>
              <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
              <TableCell>{order.shipping_address?.full_name || "N/A"}</TableCell>
              <TableCell>₹{order.total_amount.toFixed(2)}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase text-muted-foreground">
                    {order.payment_method === "manual" ? "WhatsApp" : (order.payment_method || "—")}
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    order.payment_status === "paid" && "text-green-600",
                    order.payment_status === "failed" && "text-destructive",
                    (order.payment_status === "unpaid" || order.payment_status === "cod_pending" || order.payment_status === "awaiting_contact") && "text-orange-600",
                  )}>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      order.payment_status === "paid" && "bg-green-500",
                      order.payment_status === "failed" && "bg-destructive",
                      (order.payment_status === "unpaid" || order.payment_status === "cod_pending" || order.payment_status === "awaiting_contact") && "bg-orange-500",
                    )} />
                    {(order.payment_status || "unpaid").replace(/_/g, " ")}
                  </span>
                  {order.upi_utr && (
                    <span className="text-[10px] text-muted-foreground">UTR: {order.upi_utr}</span>
                  )}
                  {order.payment_status !== "paid" && order.payment_method && order.payment_method !== "card" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2"
                      title={order.upi_utr ? "Verify and confirm payment" : "Requires verified payment proof"}
                      onClick={() => {
                        const confirmMsg = order.upi_utr 
                          ? `Confirm payment of ₹${order.total_amount.toFixed(2)} received for UTR: ${order.upi_utr}?`
                          : `Confirm that ₹${order.total_amount.toFixed(2)} was verified and received offline for ${order.payment_method}?`;
                        if (window.confirm(confirmMsg)) {
                          bulkUpdateOrders([order.id], { payment_status: "paid", status: "processing" } as any);
                        }
                      }}
                    >
                      Verify & Mark Paid
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={order.status}
                  onValueChange={(value: Order["status"]) => handleUpdateStatus(order.id, value)}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning" />
                        Pending
                      </span>
                    </SelectItem>
                    <SelectItem value="processing">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        Processing
                      </span>
                    </SelectItem>
                    <SelectItem value="shipped">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-secondary" />
                        Shipped
                      </span>
                    </SelectItem>
                    <SelectItem value="delivered">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent" />
                        Delivered
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
              {editingTrackingId === order.id ? (
                  <div className="flex flex-col gap-2">
                    <Select value={tempCarrier} onValueChange={setTempCarrier}>
                      <SelectTrigger className="w-full h-8">
                        <SelectValue placeholder="Select carrier" />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIPPING_CARRIERS.map((carrier) => (
                          <SelectItem key={carrier.value} value={carrier.value}>
                            {carrier.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={tempTrackingNumber}
                      onChange={(e) => setTempTrackingNumber(e.target.value)}
                      placeholder="Enter tracking #"
                      className="w-full h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEditingTrackingId(null);
                          setTempTrackingNumber("");
                          setTempCarrier("");
                          setTempEstimatedDelivery(undefined);
                        }
                      }}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left font-normal h-8",
                            !tempEstimatedDelivery && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {tempEstimatedDelivery ? (
                            format(tempEstimatedDelivery, "PPP")
                          ) : (
                            <span>Est. delivery date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={tempEstimatedDelivery}
                          onSelect={setTempEstimatedDelivery}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleTrackingSubmit(order.id)} disabled={!tempCarrier || !tempTrackingNumber.trim()}>
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingTrackingId(null);
                          setTempTrackingNumber("");
                          setTempCarrier("");
                          setTempEstimatedDelivery(undefined);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer hover:bg-muted px-2 py-1 rounded min-w-[100px]"
                    onClick={() => {
                      setEditingTrackingId(order.id);
                      setTempTrackingNumber(order.tracking_number || "");
                      setTempCarrier(order.shipping_carrier || "");
                      setTempEstimatedDelivery(order.estimated_delivery ? new Date(order.estimated_delivery) : undefined);
                    }}
                  >
                    {order.tracking_number ? (
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase">
                          {SHIPPING_CARRIERS.find(c => c.value === order.shipping_carrier)?.label || order.shipping_carrier}
                        </span>
                        <span>{order.tracking_number}</span>
                        {order.estimated_delivery && (
                          <span className="text-xs text-muted-foreground">
                            Est: {format(new Date(order.estimated_delivery), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">+ Add tracking</span>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsModalOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          
          {filteredOrders.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                No orders found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    );
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-12 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-serif mb-8">Seller Dashboard</h1>

      {/* Bulk Action Panel */}
      {selectedOrderIds.length > 0 && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? "s" : ""} selected
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as Order["status"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning" />
                        Pending
                      </span>
                    </SelectItem>
                    <SelectItem value="processing">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        Processing
                      </span>
                    </SelectItem>
                    <SelectItem value="shipped">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-secondary" />
                        Shipped
                      </span>
                    </SelectItem>
                    <SelectItem value="delivered">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent" />
                        Delivered
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Carrier</label>
                <Select value={bulkCarrier} onValueChange={setBulkCarrier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_CARRIERS.map((carrier) => (
                      <SelectItem key={carrier.value} value={carrier.value}>
                        {carrier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Tracking #</label>
                <Input
                  value={bulkTrackingNumber}
                  onChange={(e) => setBulkTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Est. Delivery</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !bulkEstimatedDelivery && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {bulkEstimatedDelivery ? (
                        format(bulkEstimatedDelivery, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={bulkEstimatedDelivery}
                      onSelect={setBulkEstimatedDelivery}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-primary/10">
              <Button
                onClick={handleBulkUpdate}
                disabled={isBulkUpdating || (!bulkStatus && !bulkCarrier && !bulkTrackingNumber && !bulkEstimatedDelivery)}
              >
                {isBulkUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Update ${selectedOrderIds.length} Order${selectedOrderIds.length > 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Verified Revenue</CardTitle>
              <CardDescription>Paid & confirmed orders</CardDescription>
            </div>
            <span className="text-xl font-bold text-green-500">₹</span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ₹{orders
                .filter(o => o.payment_status === "paid")
                .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
                .toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
              <CardDescription>Awaiting processing</CardDescription>
            </div>
            <PackageSearch className="w-5 h-5 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orders.filter(o => o.status === "pending").length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Shipped</CardTitle>
              <CardDescription>In transit</CardDescription>
            </div>
            <TruckIcon className="w-5 h-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orders.filter(o => o.status === "shipped").length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
              <CardDescription>All-time placed</CardDescription>
            </div>
            <CheckCircle className="w-5 h-5 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Input
            placeholder="Search order #, customer, UTR, tracking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Payment Status:</span>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="cod_pending">COD Pending</SelectItem>
              <SelectItem value="awaiting_contact">WhatsApp Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          {(searchQuery || paymentFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setPaymentFilter("all");
              }}
              className="text-xs h-9"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Orders ({applyFilters(orders).length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({filterOrdersByStatus("pending").length})</TabsTrigger>
          <TabsTrigger value="processing">Processing ({filterOrdersByStatus("processing").length})</TabsTrigger>
          <TabsTrigger value="shipped">Shipped ({filterOrdersByStatus("shipped").length})</TabsTrigger>
          <TabsTrigger value="delivered">Delivered ({filterOrdersByStatus("delivered").length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {renderOrdersTable(applyFilters(orders))}
        </TabsContent>
        
        <TabsContent value="pending">
          {renderOrdersTable(filterOrdersByStatus("pending"))}
        </TabsContent>
        
        <TabsContent value="processing">
          {renderOrdersTable(filterOrdersByStatus("processing"))}
        </TabsContent>
        
        <TabsContent value="shipped">
          {renderOrdersTable(filterOrdersByStatus("shipped"))}
        </TabsContent>
        
        <TabsContent value="delivered">
          {renderOrdersTable(filterOrdersByStatus("delivered"))}
        </TabsContent>
      </Tabs>

      <OrderDetailsModal
        order={selectedOrder}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
};

export default Dashboard;
