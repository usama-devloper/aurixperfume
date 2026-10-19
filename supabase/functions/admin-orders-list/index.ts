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

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const paymentStatus = url.searchParams.get("payment_status");
    const search = url.searchParams.get("search");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const supabase = getServiceSupabaseClient();
    let query = supabase
      .from("orders")
      .select("*, order_items(*, products(name, image, price)), profiles(full_name, phone)", { count: "exact" });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (paymentStatus && paymentStatus !== "all") {
      query = query.eq("payment_status", paymentStatus);
    }

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,upi_utr.ilike.%${search}%,tracking_number.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return err("Failed to retrieve admin orders", "DB_ERROR", 500, error.message);
    }

    await logApiCall({
      endpoint: "/admin-orders-list",
      method: req.method,
      user_id: adminUser.id,
      status_code: 200,
      duration_ms: performance.now() - start,
    });

    return ok(data, { page, limit, total: count ?? 0 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
