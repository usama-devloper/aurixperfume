import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const start = performance.now();
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return err("Method Not Allowed", "METHOD_NOT_ALLOWED", 405);
  }

  let adminUser: any = null;
  try {
    const auth = await requireAdmin(req);
    adminUser = auth.user;

    const body = await req.json();
    const id = body.id || body.product_id;

    if (!id) {
      return err("Product ID is required", "VALIDATION_ERROR", 400);
    }

    const supabase = getServiceSupabaseClient();
    // Soft delete via is_active = false
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", parseInt(id, 10))
      .select()
      .single();

    if (error) {
      return err("Failed to delete product", "DB_ERROR", 500, error.message);
    }

    await logApiCall({
      endpoint: "/admin-products-delete",
      method: req.method,
      user_id: adminUser.id,
      status_code: 200,
      duration_ms: performance.now() - start,
    });

    return ok({ message: "Product deactivated successfully", product: data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
