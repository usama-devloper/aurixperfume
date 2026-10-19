import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAuth } from "../_shared/auth.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";
import { ProfileUpdateSchema } from "../_shared/validators.ts";

Deno.serve(async (req) => {
  const start = performance.now();
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return err("Method Not Allowed", "METHOD_NOT_ALLOWED", 405);
  }

  let user: any = null;
  try {
    const auth = await requireAuth(req);
    user = auth.user;

    const body = await req.json();
    const parseResult = ProfileUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return err("Invalid profile data", "VALIDATION_ERROR", 400, parseResult.error.flatten());
    }

    const { full_name, phone } = parseResult.data;
    const supabase = getServiceSupabaseClient();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (full_name !== undefined) updatePayload.full_name = full_name;
    if (phone !== undefined) updatePayload.phone = phone;

    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...updatePayload })
      .select()
      .single();

    if (error) {
      return err("Failed to update profile", "DB_ERROR", 500, error.message);
    }

    await logApiCall({
      endpoint: "/profile-update",
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
