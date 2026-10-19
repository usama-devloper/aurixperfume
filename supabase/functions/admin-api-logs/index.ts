import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30", 10)));
    const offset = (page - 1) * limit;

    const supabase = getServiceSupabaseClient();
    const { data, count, error } = await supabase
      .from("api_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return err("Failed to retrieve API logs", "DB_ERROR", 500, error.message);
    }

    return ok(data, { page, limit, total: count ?? 0 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
