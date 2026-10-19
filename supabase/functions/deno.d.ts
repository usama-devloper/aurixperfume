// Type declarations for Deno runtime environment in Supabase Edge Functions
// This file satisfies local IDE language servers while preserving Deno native execution in production.

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "https://esm.sh/stripe@18.5.0" {
  const Stripe: any;
  export default Stripe;
}

declare module "https://esm.sh/@supabase/supabase-js@2.49.4" {
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): any;
}
