import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyOrders, getOrder, createCheckoutOrder, CheckoutPayload } from "@/lib/api/orders";
import { toast } from "@/components/ui/use-toast";

export const useApiMyOrders = (page = 1) => {
  return useQuery({
    queryKey: ["my-orders", page],
    queryFn: () => getMyOrders({ page, limit: 10 }),
    staleTime: 30 * 1000,
  });
};

export const useApiOrder = (orderId: string | undefined) => {
  return useQuery({
    queryKey: ["api-order", orderId],
    queryFn: () => (orderId ? getOrder(orderId) : null),
    enabled: !!orderId,
  });
};

export const useApiCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckoutPayload) => createCheckoutOrder(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["api-products"] });
      toast({
        title: "Order Placed Successfully",
        description: `Order #${data.order_number} confirmed.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Could not complete your order",
        variant: "destructive",
      });
    },
  });
};
