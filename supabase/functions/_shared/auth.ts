import { getSupabaseClient, getServiceSupabaseClient } from "./supabase.ts";

export interface AuthContext {
  user: any;
  isAdmin: boolean;
}

export const requireAuth = async (req: Request): Promise<AuthContext> => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing Authorization header" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = getSupabaseClient(authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired session token" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check admin status via user_roles or profiles
  const serviceClient = getServiceSupabaseClient();
  const { data: roleData } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  const isAdmin = !!roleData;

  return { user, isAdmin };
};

export const requireAdmin = async (req: Request): Promise<AuthContext> => {
  const auth = await requireAuth(req);
  if (!auth.isAdmin) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: { code: "FORBIDDEN", message: "Administrative privileges required" },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return auth;
};
