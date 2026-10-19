import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, categories, pendingOrders, totalOrders, lowStock, outOfStock, paidOrders] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).lte("stock", 5).gt("stock", 0),
        supabase.from("products").select("*", { count: "exact", head: true }).lte("stock", 0),
        supabase.from("orders").select("total_amount").eq("payment_status", "paid"),
      ]);

      const verifiedRevenue = (paidOrders.data || []).reduce(
        (sum, o) => sum + (Number(o.total_amount) || 0),
        0
      );

      return {
        products: products.count ?? 0,
        categories: categories.count ?? 0,
        pendingOrders: pendingOrders.count ?? 0,
        totalOrders: totalOrders.count ?? 0,
        lowStock: lowStock.count ?? 0,
        outOfStock: outOfStock.count ?? 0,
        verifiedRevenue,
      };
    },
    staleTime: 60_000,
  });
};
