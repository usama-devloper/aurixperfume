/**
 * Shared Supabase environment and URL validation utilities.
 * Validates URLs using the standard URL constructor and strictly enforces:
 * - Proper scheme (HTTPS on .supabase.co or HTTP on localhost)
 * - Absence of embedded credentials
 * - Absence of path, query string, or hash
 * Does not echo credentials or full sensitive URLs in error messages.
 */

export function validateSupabaseUrl(url?: string, context = "Supabase"): string {
  const trimmedUrl = url?.trim();

  if (!trimmedUrl) {
    throw new Error(
      `[Aurix Config Error] VITE_SUPABASE_URL must be defined for ${context}.`
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    throw new Error(
      `[Aurix Config Error] VITE_SUPABASE_URL is malformed for ${context}. ` +
      "Expected format: https://<project-ref>.supabase.co or http://localhost:<port>"
    );
  }

  // Reject embedded credentials (e.g. https://user:pass@host)
  if (parsed.username || parsed.password) {
    throw new Error(
      `[Aurix Config Error] VITE_SUPABASE_URL must not contain embedded user credentials for ${context}.`
    );
  }

  // Reject paths (other than empty or root slash), query strings, and hashes
  if ((parsed.pathname && parsed.pathname !== "/") || parsed.search || parsed.hash) {
    throw new Error(
      `[Aurix Config Error] VITE_SUPABASE_URL must be a base origin without path, query parameters, or hash for ${context}.`
    );
  }

  const isHttps = parsed.protocol === "https:";
  const isHttp = parsed.protocol === "http:";
  const hostname = parsed.hostname.toLowerCase();

  // Allowed patterns:
  // 1. https://<project-ref>.supabase.co (or .in/.net)
  // 2. http://localhost (or 127.0.0.1) for local Supabase emulator
  const isSupabaseHosted = isHttps && /^[a-z0-9-]+\.supabase\.(co|in|net)$/.test(hostname);
  const isLocalhost = isHttp && (hostname === "localhost" || hostname === "127.0.0.1");

  if (!isSupabaseHosted && !isLocalhost) {
    throw new Error(
      `[Aurix Config Error] VITE_SUPABASE_URL host or protocol is unsupported for ${context}. ` +
      "Expected HTTPS on .supabase.co or HTTP on localhost."
    );
  }

  // Return clean origin without trailing slash
  return parsed.origin;
}
