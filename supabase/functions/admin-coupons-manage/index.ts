import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";
import { AdminCouponCreateSchema } from "../_shared/validators.ts";

Deno.serve(async (req) => {
  const start = performance.now();
  const cors = handleCors(req);
  if (cors) return cors;

  let adminUser: any = null;
  try {
    const auth = await requireAdmin(req);
    adminUser = auth.user;
    const supabase = getServiceSupabaseClient();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return err("Failed to retrieve coupons", "DB_ERROR", 500, error.message);
      }
      return ok(data);
    }

    if (req.method === "POST") {
      const rawBody = await req.json();
      const parseResult = AdminCouponCreateSchema.safeParse(rawBody);
      if (!parseResult.success) {
        return err("Invalid coupon data", "VALIDATION_ERROR", 400, parseResult.error.flatten());
      }

      const { data, error } = await supabase
        .from("coupons")
        .insert(parseResult.data)
        .select()
        .single();

      if (error) {
        return err("Failed to create coupon (may be duplicate code)", "DB_ERROR", 400, error.message);
      }

      await logApiCall({
        endpoint: "/admin-coupons-create",
        method: req.method,
        user_id: adminUser.id,
        status_code: 201,
        duration_ms: performance.now() - start,
      });

      return ok(data, undefined, 201);
    }

    return err("Method Not Allowed", "METHOD_NOT_ALLOWED", 405);
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
