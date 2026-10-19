import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { logApiCall } from "../_shared/logger.ts";
import { AdminOrderStatusUpdateSchema } from "../_shared/validators.ts";

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
    const parseResult = AdminOrderStatusUpdateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return err("Invalid status update data", "VALIDATION_ERROR", 400, parseResult.error.flatten());
    }

    const { order_id, status, tracking_number, shipping_carrier, estimated_delivery } = parseResult.data;

    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (tracking_number !== undefined) updatePayload.tracking_number = tracking_number;
    if (shipping_carrier !== undefined) updatePayload.shipping_carrier = shipping_carrier;
    if (estimated_delivery !== undefined) updatePayload.estimated_delivery = estimated_delivery;

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", order_id)
      .select()
      .single();

    if (error) {
      return err("Failed to update order status", "DB_ERROR", 500, error.message);
    }

    await logApiCall({
      endpoint: "/admin-orders-update-status",
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
