import { supabase } from "@/integrations/supabase/client";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(message: string, code = "API_ERROR", status = 400, details?: any) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp?: string;
  };
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}

export const getBaseFunctionUrl = (): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  return `${supabaseUrl}/functions/v1`;
};

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { params, timeoutMs = 15000, ...fetchOptions } = options;

  // Build query string
  let url = `${getBaseFunctionUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Get current user session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: anonKey,
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    const json: ApiResponse<T> = await response.json();

    if (!response.ok || !json.success) {
      throw new ApiError(
        json.error?.message || `Request failed with status ${response.status}`,
        json.error?.code || "HTTP_ERROR",
        response.status,
        json.error?.details
      );
    }

    return json.data;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new ApiError("Request timeout exceeded", "TIMEOUT", 408);
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || "Network request failed", "NETWORK_ERROR", 500);
  } finally {
    clearTimeout(timeoutId);
  }
};
