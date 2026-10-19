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
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const minPrice = url.searchParams.get("min_price");
    const maxPrice = url.searchParams.get("max_price");
    const sort = url.searchParams.get("sort") || "featured";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const supabase = getServiceSupabaseClient();
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    if (category && category !== "all") {
      query = query.ilike("category", `%${category}%`);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (minPrice) {
      query = query.gte("price", parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte("price", parseFloat(maxPrice));
    }

    if (sort === "price-low") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price-high") {
      query = query.order("price", { ascending: false });
    } else if (sort === "rating") {
      query = query.order("rating", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("featured", { ascending: false }).order("id", { ascending: true });
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      await logApiCall({
        endpoint: "/products-list",
        method: req.method,
        status_code: 500,
        response_body: error,
        duration_ms: performance.now() - start,
      });
      return err("Failed to retrieve products", "DB_ERROR", 500, error.message);
    }

    const response = ok(data, {
      page,
      limit,
      total: count ?? 0,
    });

    await logApiCall({
      endpoint: "/products-list",
      method: req.method,
      status_code: 200,
      duration_ms: performance.now() - start,
    });

    return response;
  } catch (error: any) {
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
