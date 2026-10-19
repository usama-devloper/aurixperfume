import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";
import { AdminProductCreateSchema } from "../_shared/validators.ts";

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
    const parseResult = AdminProductCreateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return err("Invalid product data", "VALIDATION_ERROR", 400, parseResult.error.flatten());
    }

    const productData = parseResult.data;
    const slug = productData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + Date.now().toString().slice(-4);

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        ...productData,
        slug,
        in_stock: productData.stock > 0,
      })
      .select()
      .single();

    if (error) {
      return err("Failed to create product", "DB_ERROR", 500, error.message);
    }

    await logApiCall({
      endpoint: "/admin-products-create",
      method: req.method,
      user_id: adminUser.id,
      status_code: 201,
      duration_ms: performance.now() - start,
    });

    return ok(data, undefined, 201);
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
