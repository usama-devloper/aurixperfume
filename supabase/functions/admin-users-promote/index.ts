import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";
import { AdminUserPromoteSchema } from "../_shared/validators.ts";

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
    const parseResult = AdminUserPromoteSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return err("Invalid user data", "VALIDATION_ERROR", 400, parseResult.error.flatten());
    }

    const { user_id, role } = parseResult.data;
    const supabase = getServiceSupabaseClient();

    // 1. Update profiles table
    await supabase.from("profiles").upsert({ id: user_id, role });

    // 2. Synchronize user_roles table
    if (role === "admin") {
      await supabase.from("user_roles").upsert({ user_id, role: "admin" });
    } else {
      await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
    }

    await logApiCall({
      endpoint: "/admin-users-promote",
      method: req.method,
      user_id: adminUser.id,
      status_code: 200,
      duration_ms: performance.now() - start,
    });

    return ok({ message: `User role updated to ${role}`, user_id, role });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Internal Server Error", "SERVER_ERROR", 500);
  }
});
