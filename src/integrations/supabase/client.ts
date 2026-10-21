import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { validateSupabaseUrl } from '@/lib/supabaseUrl';

/**
 * Validates Supabase environment variables and fails fast if missing or malformed.
 * Enforces proper origin, protocol, host, and absence of path/query/auth.
 * Does not echo credentials or URLs into error messages.
 */
export function validateSupabaseConfig(
  url?: string,
  key?: string
): { url: string; key: string } {
  const trimmedKey = key?.trim();

  if (!url?.trim() || !trimmedKey) {
    throw new Error(
      "[Aurix Config Error] Missing Supabase environment variables: " +
      "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be defined."
    );
  }

  const validUrl = validateSupabaseUrl(url, "Supabase Client");
  return { url: validUrl, key: trimmedKey };
}

const config = validateSupabaseConfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

export const supabase = createClient<Database>(config.url, config.key);