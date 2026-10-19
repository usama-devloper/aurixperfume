import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const start = performance.now();
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const url = new URL(req.url);
    const idParam = url.searchParams.get("id");
    const slugParam = url.searchParams.get("slug");

    if (!idParam && !slugParam) {
      return err("Product ID or slug is required", "VALIDATION_ERROR", 400);
    }

    const supabase = getServiceSupabaseClient();
    let query = supabase.from("products").select("*").eq("is_active", true);

    if (idParam) {
      query = query.eq("id", parseInt(idParam, 10));
    } else if (slugParam) {
      query = query.eq("slug", slugParam);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      await logApiCall({
        endpoint: "/products-get",
        method: req.method,
        status_code: 500,
        response_body: error,
        duration_ms: performance.now() - start,
      });
      return err("Database query failed", "DB_ERROR", 500, error.message);
    }

    if (!data) {
      await logApiCall({
        endpoint: "/products-get",
        method: req.method,
        status_code: 404,
        duration_ms: performance.now() - start,
      });
      return err("Product not found", "NOT_FOUND", 404);
    }

    await logApiCall({
      endpoint: "/products-get",
      method: req.method,
      status_code: 200,
      duration_ms: performance.now() - start,
    });

    return ok(data);
  } catch (error: any) {
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
