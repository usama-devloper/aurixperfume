import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";
import { AdminProductUpdateSchema } from "../_shared/validators.ts";

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

    const rawBody = await req.json();
    const parseResult = AdminProductUpdateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return err("Invalid product data", "VALIDATION_ERROR", 400, parseResult.error.flatten());
    }

    const { id, ...updates } = parseResult.data;
    const updatePayload: Record<string, any> = { ...updates };

    if (updates.stock !== undefined) {
      updatePayload.in_stock = updates.stock > 0;
    }

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return err("Failed to update product", "DB_ERROR", 500, error.message);
    }

    await logApiCall({
      endpoint: "/admin-products-update",
      method: req.method,
      user_id: adminUser.id,
      status_code: 200,
      duration_ms: performance.now() - start,
    });

    return ok(data);
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
