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
    const orderId = url.searchParams.get("id");

    if (!orderId) {
      return err("Order ID is required", "VALIDATION_ERROR", 400);
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = getSupabaseClient(authHeader);

    let query = supabase
      .from("orders")
      .select("*, order_items(*, products(name, image, price, slug))")
      .eq("id", orderId);

    // If not admin, restrict to own order
    if (!auth.isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return err("Failed to retrieve order", "DB_ERROR", 500, error.message);
    }

    if (!data) {
      return err("Order not found or access denied", "NOT_FOUND", 404);
    }

    await logApiCall({
      endpoint: "/orders-get",
      method: req.method,
      user_id: user.id,
      status_code: 200,
      duration_ms: performance.now() - start,
    });

    return ok(data);
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
