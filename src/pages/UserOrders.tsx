
import { Link, Navigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageCheck, Loader2 } from "lucide-react";

const UserOrders = () => {
  const { user, loading: isAuthLoading } = useAuth();
  const { orders, loading } = useOrders();

  if (isAuthLoading) {
    return (
      <div className="container mx-auto py-24 flex flex-col justify-center items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-perfume-gold" />
        <p className="text-xs uppercase tracking-widest text-neutral-400">Loading orders...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/orders" replace />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-serif">My Orders</CardTitle>
          <CardDescription>View your order history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading orders...</p>
          ) : orders.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Order Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), "dd-MM-yyyy")}
                      </TableCell>
                      <TableCell className="capitalize">{order.status}</TableCell>
                      <TableCell className="text-right">
                        ₹{order.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/order-tracking?id=${order.id}`}>
                            <PackageCheck className="mr-2 h-4 w-4" />
                            Track
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-lg text-muted-foreground">No orders found.</p>
              <Button asChild className="mt-4">
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserOrders;
