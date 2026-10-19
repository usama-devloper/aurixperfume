import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const start = performance.now();
  const cors = handleCors(req);
  if (cors) return cors;

  let adminUser: any = null;
  try {
    const auth = await requireAdmin(req);
    adminUser = auth.user;

    const supabase = getServiceSupabaseClient();

    const [
      productsCount,
      ordersCount,
      pendingOrders,
      paidOrders,
      lowStockProducts,
      recentOrders,
      apiLogsSummary,
    ] = await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("total_amount").eq("payment_status", "paid"),
      supabase.from("products").select("id, name, stock").lte("stock", 5).eq("is_active", true),
      supabase.from("orders").select("id, order_number, total_amount, status, payment_status, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("api_logs").select("*", { count: "exact", head: true }),
    ]);

    const verifiedRevenue = (paidOrders.data || []).reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0
    );

    const stats = {
      total_products: productsCount.count ?? 0,
      total_orders: ordersCount.count ?? 0,
      pending_orders: pendingOrders.count ?? 0,
      verified_revenue: verifiedRevenue,
      low_stock_count: lowStockProducts.data?.length ?? 0,
      low_stock_items: lowStockProducts.data || [],
      recent_orders: recentOrders.data || [],
      total_api_calls: apiLogsSummary.count ?? 0,
    };

    await logApiCall({
      endpoint: "/admin-dashboard-stats",
      method: req.method,
      user_id: adminUser.id,
      status_code: 200,
      duration_ms: performance.now() - start,
    });

    return ok(stats);
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
