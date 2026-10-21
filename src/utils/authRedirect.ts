/**
 * Validates a requested redirect path to prevent open redirect vulnerabilities.
 * Ensures the destination is strictly an internal path on the current origin.
 *
 * Rules:
 * - Must be non-empty string starting with a single '/'
 * - Must NOT start with '//' (protocol-relative URL)
 * - Must NOT start with '/\\' or contain backslashes
 * - Must NOT contain control characters or URI schemes
 * - Falls back safely to defaultPath ('/')
 */
export function sanitizeRedirectPath(
  rawPath: string | null | undefined,
  defaultPath = "/"
): string {
  if (!rawPath || typeof rawPath !== "string") {
    return defaultPath;
  }

  const trimmed = rawPath.trim();

  // Must start with exactly one forward slash, followed by a non-slash, non-backslash character or be just "/"
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return defaultPath;
  }

  // Reject protocol indicators, control characters, or HTML tags
  if (
    /[\u0000-\u001F\u007F]/.test(trimmed) ||
    /^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ||
    /[<>]/.test(trimmed)
  ) {
    return defaultPath;
  }

  return trimmed;
}

/**
 * Builds the fully qualified absolute redirect URL for Supabase OAuth.
 * Uses window.location.origin combined with the sanitized internal path.
 */
export function getSafeOAuthRedirectUrl(rawPath: string | null | undefined): string {
  const safePath = sanitizeRedirectPath(rawPath, "/");
  const origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
  return `${origin}${safePath}`;
}
