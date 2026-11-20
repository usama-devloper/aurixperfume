// Production-hardened CORS Headers for Supabase Edge Functions
export const ALLOWED_ORIGINS = new Set([
  "https://aurixperfume.in",
  "https://www.aurixperfume.in",
]);

export const DEFAULT_PRODUCTION_ORIGIN = "https://aurixperfume.in";

export const getCorsHeaders = (origin?: string | null): Record<string, string> => {
  const trimmed = origin ? origin.trim() : null;
  const allowedOrigin =
    trimmed && ALLOWED_ORIGINS.has(trimmed) ? trimmed : DEFAULT_PRODUCTION_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin",
  };
};

// Default CORS headers scoped to production origin (no wildcard '*')
export const corsHeaders = getCorsHeaders(DEFAULT_PRODUCTION_ORIGIN);

export const handleCors = (req: Request): Response | null => {
  const rawOrigin = req.headers.get("origin");
  const trimmedOrigin = rawOrigin ? rawOrigin.trim() : null;
  const headers = getCorsHeaders(trimmedOrigin);

  // Reject unauthorized browser origins while preserving server-to-server requests (no Origin header)
  if (trimmedOrigin !== null && !ALLOWED_ORIGINS.has(trimmedOrigin)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "FORBIDDEN_ORIGIN",
          message: "Origin not allowed",
        },
      }),
      {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  return null;
};
