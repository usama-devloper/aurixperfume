import { getServiceSupabaseClient } from "./supabase.ts";

export interface LogEntry {
  endpoint: string;
  method: string;
  user_id?: string | null;
  status_code: number;
  request_body?: any;
  response_body?: any;
  duration_ms: number;
  ip_address?: string | null;
}

export const logApiCall = async (entry: LogEntry): Promise<void> => {
  try {
    const supabase = getServiceSupabaseClient();
    await supabase.from("api_logs").insert({
      endpoint: entry.endpoint,
      method: entry.method,
      user_id: entry.user_id || null,
      status_code: entry.status_code,
      request_body: entry.request_body ? entry.request_body : null,
      response_body: entry.response_body ? entry.response_body : null,
      duration_ms: Math.round(entry.duration_ms),
      ip_address: entry.ip_address || null,
    });
  } catch (err) {
    // Non-blocking log failure
    console.error("[api_logs] Failed to record log:", err);
  }
};
