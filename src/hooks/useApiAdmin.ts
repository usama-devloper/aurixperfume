import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminStats,
  getAdminOrders,
  updateOrderStatus,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminCoupons,
  createAdminCoupon,
  getAdminApiLogs,
  promoteUserRole,
} from "@/lib/api/admin";
import { toast } from "@/components/ui/use-toast";

export const useApiAdminStats = () => {
  return useQuery({
    queryKey: ["admin-api-stats"],
    queryFn: getAdminStats,
    staleTime: 30 * 1000,
  });
};

export const useApiAdminOrders = (params?: {
  status?: string;
  payment_status?: string;
  search?: string;
  page?: number;
}) => {
  return useQuery({
    queryKey: ["admin-api-orders", params],
    queryFn: () => getAdminOrders(params),
    staleTime: 15 * 1000,
  });
};

export const useApiAdminCoupons = () => {
  return useQuery({
    queryKey: ["admin-api-coupons"],
    queryFn: getAdminCoupons,
    staleTime: 60 * 1000,
  });
};

export const useApiAdminLogs = (page = 1) => {
  return useQuery({
    queryKey: ["admin-api-logs", page],
    queryFn: () => getAdminApiLogs({ page, limit: 30 }),
    staleTime: 10 * 1000,
  });
};
