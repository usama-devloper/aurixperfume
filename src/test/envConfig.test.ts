import { describe, it, expect, vi } from "vitest";
import { validateSupabaseConfig } from "../integrations/supabase/client";
import { validateSupabaseUrl } from "../lib/supabaseUrl";
import { getBaseFunctionUrl } from "../lib/api/client";
import * as fs from "fs";
import * as path from "path";

describe("Supabase Client Environment Configuration & Shared URL Validation", () => {
  const validUrl = "https://staging-project-123.supabase.co";
  const validKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyPayload.dummySignature";

  describe("Shared validateSupabaseUrl logic", () => {
    it("accepts valid HTTPS Supabase project hostnames", () => {
      expect(validateSupabaseUrl("https://project-abc.supabase.co")).toBe("https://project-abc.supabase.co");
      expect(validateSupabaseUrl("https://project-abc.supabase.in")).toBe("https://project-abc.supabase.in");
      expect(validateSupabaseUrl("https://project-abc.supabase.net")).toBe("https://project-abc.supabase.net");
    });

    it("accepts legitimate production host format without error", () => {
      const prodUrl = "https://athtckywzwdslgitvwij.supabase.co";
      expect(validateSupabaseUrl(prodUrl)).toBe(prodUrl);
    });

    it("accepts localhost and 127.0.0.1 for local emulator development", () => {
      expect(validateSupabaseUrl("http://localhost:54321")).toBe("http://localhost:54321");
      expect(validateSupabaseUrl("http://127.0.0.1:54321")).toBe("http://127.0.0.1:54321");
    });

    it("rejects empty, undefined, or whitespace-only inputs", () => {
      expect(() => validateSupabaseUrl(undefined)).toThrow(/must be defined/);
      expect(() => validateSupabaseUrl("")).toThrow(/must be defined/);
      expect(() => validateSupabaseUrl("   ")).toThrow(/must be defined/);
    });

    it("rejects malformed URLs without leaking sensitive context", () => {
      expect(() => validateSupabaseUrl("invalid://url:bad")).toThrow(/is malformed/);
      expect(() => validateSupabaseUrl("not-a-url")).toThrow(/is malformed/);
    });

    it("rejects embedded user credentials (user:pass@host)", () => {
      expect(() => validateSupabaseUrl("https://user:pass@project-abc.supabase.co")).toThrow(
        /must not contain embedded user credentials/
      );
    });

    it("rejects unexpected paths, query parameters, or hashes", () => {
      expect(() => validateSupabaseUrl("https://project-abc.supabase.co/extra/path")).toThrow(
        /must be a base origin without path, query parameters, or hash/
      );
      expect(() => validateSupabaseUrl("https://project-abc.supabase.co?token=secret")).toThrow(
        /must be a base origin without path, query parameters, or hash/
      );
      expect(() => validateSupabaseUrl("https://project-abc.supabase.co#anchor")).toThrow(
        /must be a base origin without path, query parameters, or hash/
      );
    });

    it("rejects insecure HTTP for remote hosts and arbitrary third-party domains", () => {
      expect(() => validateSupabaseUrl("http://project-abc.supabase.co")).toThrow(
        /host or protocol is unsupported/
      );
      expect(() => validateSupabaseUrl("https://arbitrary-phishing.com")).toThrow(
        /host or protocol is unsupported/
      );
      expect(() => validateSupabaseUrl("https://sub.domain.attacker.co")).toThrow(
        /host or protocol is unsupported/
      );
    });
  });

  describe("validateSupabaseConfig (Frontend Client Validation)", () => {
    it("returns clean origin and key for valid inputs", () => {
      const config = validateSupabaseConfig(`  ${validUrl}  `, `  ${validKey}  `);
      expect(config.url).toBe(validUrl);
      expect(config.key).toBe(validKey);
    });

    it("fails fast when URL or key is missing", () => {
      expect(() => validateSupabaseConfig(undefined, validKey)).toThrow(
        /Missing Supabase environment variables/
      );
      expect(() => validateSupabaseConfig(validUrl, undefined)).toThrow(
        /Missing Supabase environment variables/
      );
      expect(() => validateSupabaseConfig(validUrl, "   ")).toThrow(
        /Missing Supabase environment variables/
      );
    });

    it("enforces the exact same rejection rules as validateSupabaseUrl (embedded credentials, path, query, hash)", () => {
      expect(() => validateSupabaseConfig("https://user:pass@test.supabase.co", validKey)).toThrow(
        /must not contain embedded user credentials/
      );
      expect(() => validateSupabaseConfig("https://test.supabase.co/extra", validKey)).toThrow(
        /must be a base origin without path, query parameters, or hash/
      );
      expect(() => validateSupabaseConfig("https://test.supabase.co?key=123", validKey)).toThrow(
        /must be a base origin without path, query parameters, or hash/
      );
      expect(() => validateSupabaseConfig("https://test.supabase.co#fragment", validKey)).toThrow(
        /must be a base origin without path, query parameters, or hash/
      );
    });
  });

  describe("getBaseFunctionUrl (Edge Function Validation)", () => {
    it("returns origin/functions/v1 and normalizes trailing slashes", () => {
      const origEnv = import.meta.env.VITE_SUPABASE_URL;
      try {
        import.meta.env.VITE_SUPABASE_URL = "https://staging-project-123.supabase.co/";
        expect(getBaseFunctionUrl()).toBe("https://staging-project-123.supabase.co/functions/v1");
      } finally {
        import.meta.env.VITE_SUPABASE_URL = origEnv;
      }
    });

    it("enforces the exact same rejection rules (paths, query, credentials, malicious hosts)", () => {
      const origEnv = import.meta.env.VITE_SUPABASE_URL;
      try {
        import.meta.env.VITE_SUPABASE_URL = "https://user:pass@test.supabase.co";
        expect(() => getBaseFunctionUrl()).toThrow(/must not contain embedded user credentials/);

        import.meta.env.VITE_SUPABASE_URL = "https://test.supabase.co/badpath";
        expect(() => getBaseFunctionUrl()).toThrow(/must be a base origin without path/);

        import.meta.env.VITE_SUPABASE_URL = "https://test.supabase.co?token=xyz";
        expect(() => getBaseFunctionUrl()).toThrow(/must be a base origin without path/);

        import.meta.env.VITE_SUPABASE_URL = "https://malicious-attacker.com";
        expect(() => getBaseFunctionUrl()).toThrow(/host or protocol is unsupported/);
      } finally {
        import.meta.env.VITE_SUPABASE_URL = origEnv;
      }
    });
  });

  describe("Module-Level Initialization Path Testing", () => {
    it("fails fast during dynamic module import when VITE_SUPABASE_URL is missing", async () => {
      vi.resetModules();
      const origUrl = import.meta.env.VITE_SUPABASE_URL;
      try {
        delete (import.meta.env as any).VITE_SUPABASE_URL;
        await expect(import("../integrations/supabase/client")).rejects.toThrow(
          /Missing Supabase environment variables/
        );
      } finally {
        import.meta.env.VITE_SUPABASE_URL = origUrl;
        vi.resetModules();
      }
    });

    it("fails fast during dynamic module import when VITE_SUPABASE_PUBLISHABLE_KEY is missing", async () => {
      vi.resetModules();
      const origKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      try {
        delete (import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY;
        await expect(import("../integrations/supabase/client")).rejects.toThrow(
          /Missing Supabase environment variables/
        );
      } finally {
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY = origKey;
        vi.resetModules();
      }
    });

    it("successfully loads module when valid configuration is present", async () => {
      vi.resetModules();
      const mod = await import("../integrations/supabase/client");
      expect(mod.supabase).toBeDefined();
      expect(typeof mod.supabase.rpc).toBe("function");
    });
  });

  describe("Anti-Regression: No Hardcoded Production Credentials in Frontend Source", () => {
    it("ensures client.ts does not hardcode production project ref or anon key", () => {
      const clientFilePath = path.resolve(__dirname, "../integrations/supabase/client.ts");
      const content = fs.readFileSync(clientFilePath, "utf-8");

      expect(content).not.toContain("athtckywzwdslgitvwij");
      expect(content).not.toContain("9WU-6V--MCK21tqj9MMesXyLO_GzTZR3QOrcVX89-eg");
    });
  });
});
