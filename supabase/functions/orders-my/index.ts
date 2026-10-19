import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAuth } from "../_shared/auth.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const start = performance.now();
  const cors = handleCors(req);
  if (cors) return cors;

  let user: any = null;
  try {
    const auth = await requireAuth(req);
    user = auth.user;

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
    const offset = (page - 1) * limit;

    const authHeader = req.headers.get("Authorization");
    const supabase = getSupabaseClient(authHeader);

    const { data, count, error } = await supabase
      .from("orders")
      .select("*, order_items(*, products(name, image, price))", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return err("Failed to retrieve orders", "DB_ERROR", 500, error.message);
    }

    await logApiCall({
      endpoint: "/orders-my",
      method: req.method,
      user_id: user.id,
      status_code: 200,
      duration_ms: performance.now() - start,
    });

    return ok(data, { page, limit, total: count ?? 0 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
