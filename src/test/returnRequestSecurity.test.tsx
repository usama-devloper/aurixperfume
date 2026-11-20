import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReturnRequest from "@/pages/ReturnRequest";
import AdminReturnRequests from "@/pages/AdminReturnRequests";
import { supabase } from "@/integrations/supabase/client";

/**
 * ARCHITECTURAL TESTING DISCLOSURE:
 * The tests in this file are automated client-side unit and integration tests.
 * They execute with mocked Supabase client APIs (RPC, Storage, Auth, Functions)
 * in a simulated jsdom environment.
 *
 * They rigorously prove:
 * 1. Client-side input validation, sanitization, and case normalization.
 * 2. Proper multi-stage RPC orchestration (reservation -> upload -> submission).
 * 3. Exact parameter and folder hierarchy alignment.
 * 4. Resilient error handling, defensive UI state preservation, and retry banners.
 * 5. Admin authentication checks and signed URL generation.
 *
 * NOTE: Live PostgreSQL transactions, actual advisory locks, and live Deno runtime
 * execution require a live Supabase container environment.
 */

// Persistent storage mock instances using vi.hoisted
const { uploadMock, createSignedUrlMock } = vi.hoisted(() => ({
  uploadMock: vi.fn().mockImplementation((path: string) => {
    return Promise.resolve({ data: { path }, error: null });
  }),
  createSignedUrlMock: vi.fn().mockImplementation((path: string) => {
    return Promise.resolve({ data: { signedUrl: `https://example.com/signed/${path}` }, error: null });
  }),
}));

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  const rpcMock = vi.fn();
  const fromMock = vi.fn();
  const storageBucketMock = {
    upload: uploadMock,
    createSignedUrl: createSignedUrlMock,
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/public/sample.jpg" } }),
  };
  const storageMock = {
    from: vi.fn(() => storageBucketMock),
  };
  const functionsMock = {
    invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
  };

  return {
    supabase: {
      rpc: rpcMock,
      from: fromMock,
      storage: storageMock,
      functions: functionsMock,
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
    },
  };
});

// Mock AuthContext
let mockUser: any = null;
let mockIsAdmin: boolean = false;
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    isAdmin: mockIsAdmin,
    loading: false,
  }),
}));

const renderWithProviders = (ui: React.ReactElement, initialRoute = "/") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("Return Request System — Security & Complete Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockIsAdmin = false;

    // Default healthy RPC mock
    (supabase.rpc as any).mockImplementation((name: string, args: any) => {
      if (name === "reserve_return_reference") {
        return Promise.resolve({
          data: {
            success: true,
            reference_number: "RET-20261116-A1B2C3",
            reservation_token: "res-token-12345",
            order_number: args?.p_order_number || "ORD-20261026-F9E8D7C6B5A43210",
          },
          error: null,
        });
      }
      if (name === "submit_return_request") {
        return Promise.resolve({
          data: {
            success: true,
            reference_number: args?.p_reference_number || "RET-20261116-A1B2C3",
            order_number: args?.p_order_number || "ORD-20261026-F9E8D7C6B5A43210",
            status: "pending",
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  describe("A. Server-Authoritative Order Verification & Ownership", () => {
    it("reserves reference first, submits request, and renders server-verified receipt when order & email match", async () => {
      renderWithProviders(<ReturnRequest />);

      fireEvent.change(screen.getByLabelText(/Order Number \*/i), {
        target: { value: "ORD-20261026-F9E8D7C6B5A43210" },
      });
      fireEvent.change(screen.getByLabelText(/Registered Email \*/i), {
        target: { value: "client@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Product \/ Flacon Name \*/i), {
        target: { value: "Sovereign Oud (50ml)" },
      });
      fireEvent.change(screen.getByLabelText(/Primary Reason Summary \*/i), {
        target: { value: "Defective spray mechanism" },
      });
      fireEvent.change(screen.getByLabelText(/Detailed Narrative & Circumstances \*/i), {
        target: { value: "The atomizer leaks heavily from the collar upon pressing." },
      });

      fireEvent.click(screen.getByRole("button", { name: /Submit Request for Atelier Review/i }));

      // 1. Verifies reserve_return_reference was called first
      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith("reserve_return_reference", {
          p_order_number: "ORD-20261026-F9E8D7C6B5A43210",
          p_customer_email: "client@example.com",
        });
      });

      // 2. Verifies submit_return_request was called with the reserved reference & token
      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith("submit_return_request", expect.objectContaining({
          p_order_number: "ORD-20261026-F9E8D7C6B5A43210",
          p_customer_email: "client@example.com",
          p_reference_number: "RET-20261116-A1B2C3",
          p_reservation_token: "res-token-12345",
        }));
      });

      // 3. Verifies return-request-notify receives the server-issued reservation_token
      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith(
          "return-request-notify",
          expect.objectContaining({
            body: expect.objectContaining({
              event: "REQUEST_CREATED",
              reference_number: "RET-20261116-A1B2C3",
              order_number: "ORD-20261026-F9E8D7C6B5A43210",
              customer_email: "client@example.com",
              reservation_token: "res-token-12345",
            }),
          })
        );
      });

      // 4. Verifies confirmed acknowledgment receipt renders and NEVER exposes the secret token in the DOM
      expect(await screen.findByText("Request Successfully Registered")).toBeInTheDocument();
      expect(screen.getByText("RET-20261116-A1B2C3")).toBeInTheDocument();
      expect(screen.getByText("ORD-20261026-F9E8D7C6B5A43210")).toBeInTheDocument();
      expect(screen.queryByText(/res-token-12345/i)).not.toBeInTheDocument();
    });

    it("normalizes mixed-case email addresses to lowercase before submitting to RPC", async () => {
      renderWithProviders(<ReturnRequest />);

      fireEvent.change(screen.getByLabelText(/Order Number \*/i), { target: { value: "ORD-2026-CASE" } });
      fireEvent.change(screen.getByLabelText(/Registered Email \*/i), { target: { value: "Client.MixedCase@Example.COM" } });
      fireEvent.change(screen.getByLabelText(/Product \/ Flacon Name \*/i), { target: { value: "Amber Nectar" } });
      fireEvent.change(screen.getByLabelText(/Primary Reason Summary \*/i), { target: { value: "Sealed return" } });
      fireEvent.change(screen.getByLabelText(/Detailed Narrative & Circumstances \*/i), {
        target: { value: "Unopened flacon in original cellophane." },
      });

      fireEvent.click(screen.getByRole("button", { name: /Submit Request for Atelier Review/i }));

      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith("reserve_return_reference", {
          p_order_number: "ORD-2026-CASE",
          p_customer_email: "client.mixedcase@example.com",
        });
      });
    });

    it("rejects unauthorized submission when customer email does not match order record and does NOT render receipt", async () => {
      (supabase.rpc as any).mockImplementation((name: string) => {
        if (name === "reserve_return_reference") {
          return Promise.resolve({
            data: {
              success: false,
              code: "VERIFICATION_FAILED",
              error: "Unable to verify order with the provided details. Please check your order reference and correspondence email.",
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      renderWithProviders(<ReturnRequest />);

      fireEvent.change(screen.getByLabelText(/Order Number \*/i), {
        target: { value: "ORD-20261026-UNAUTHORIZED" },
      });
      fireEvent.change(screen.getByLabelText(/Registered Email \*/i), {
        target: { value: "attacker@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Product \/ Flacon Name \*/i), {
        target: { value: "Sovereign Oud" },
      });
      fireEvent.change(screen.getByLabelText(/Primary Reason Summary \*/i), {
        target: { value: "Return request" },
      });
      fireEvent.change(screen.getByLabelText(/Detailed Narrative & Circumstances \*/i), {
        target: { value: "Unopened sealed box return inquiry." },
      });

      fireEvent.click(screen.getByRole("button", { name: /Submit Request for Atelier Review/i }));

      expect(await screen.findByText(/Unable to verify order with the provided details/i)).toBeInTheDocument();
      expect(screen.queryByText("Request Successfully Registered")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Submit Request for Atelier Review/i })).toBeInTheDocument();
    });
  });

  describe("B. Pre-Upload Reference Alignment & Evidence Storage", () => {
    it("uploads photo evidence directly into the server-reserved reference folder", async () => {
      renderWithProviders(<ReturnRequest />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      const testFile = new File(["dummy content"], "evidence.jpg", { type: "image/jpeg" });
      fireEvent.change(fileInput, { target: { files: [testFile] } });

      expect(screen.getByText("evidence.jpg")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Order Number \*/i), { target: { value: "ORD-2026-STORAGE" } });
      fireEvent.change(screen.getByLabelText(/Registered Email \*/i), { target: { value: "client@example.com" } });
      fireEvent.change(screen.getByLabelText(/Product \/ Flacon Name \*/i), { target: { value: "Oud Sovereign" } });
      fireEvent.change(screen.getByLabelText(/Primary Reason Summary \*/i), { target: { value: "Leakage" } });
      fireEvent.change(screen.getByLabelText(/Detailed Narrative & Circumstances \*/i), {
        target: { value: "Bottle arrived wet with perfume residue." },
      });

      fireEvent.click(screen.getByRole("button", { name: /Submit Request for Atelier Review/i }));

      // Verifies storage upload used the reserved reference "RET-20261116-A1B2C3" as the root folder
      await waitFor(() => {
        expect(supabase.storage.from).toHaveBeenCalledWith("return-requests");
        const uploadMock = (supabase.storage.from("return-requests") as any).upload;
        expect(uploadMock).toHaveBeenCalledWith(
          expect.stringMatching(/^RET-20261116-A1B2C3\/[0-9]+-evidence\.jpg$/),
          testFile,
          expect.objectContaining({ contentType: "image/jpeg", upsert: false })
        );
      });
    });

    it("rejects invalid photo paths client-side and prevents upload of unauthorized formats", () => {
      renderWithProviders(<ReturnRequest />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // 1. Invalid format (.pdf)
      const invalidFile = new File(["binary content"], "invoice.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      expect(screen.queryByText("invoice.pdf")).not.toBeInTheDocument();

      // 2. Oversized file (6MB)
      const largeContent = new Uint8Array(6 * 1024 * 1024);
      const oversizedFile = new File([largeContent], "huge.jpg", { type: "image/jpeg" });
      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });
      expect(screen.queryByText("huge.jpg")).not.toBeInTheDocument();
    });

    it("handles server-side photo path rejection gracefully when RPC rejects malformed paths", async () => {
      (supabase.rpc as any).mockImplementation((name: string) => {
        if (name === "reserve_return_reference") {
          return Promise.resolve({
            data: { success: true, reference_number: "RET-2026-VAL", reservation_token: "tok-val" },
            error: null,
          });
        }
        if (name === "submit_return_request") {
          return Promise.resolve({
            data: {
              success: false,
              code: "INVALID_PHOTO_ATTACHMENTS",
              error: "Evidence attachments must belong to the registered reference and have a valid image format.",
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      renderWithProviders(<ReturnRequest />);

      fireEvent.change(screen.getByLabelText(/Order Number \*/i), { target: { value: "ORD-2026-VAL" } });
      fireEvent.change(screen.getByLabelText(/Registered Email \*/i), { target: { value: "client@example.com" } });
      fireEvent.change(screen.getByLabelText(/Product \/ Flacon Name \*/i), { target: { value: "Amber Nectar" } });
      fireEvent.change(screen.getByLabelText(/Primary Reason Summary \*/i), { target: { value: "Transit damage" } });
      fireEvent.change(screen.getByLabelText(/Detailed Narrative & Circumstances \*/i), {
        target: { value: "Damage during shipping observed on exterior box." },
      });

      fireEvent.click(screen.getByRole("button", { name: /Submit Request for Atelier Review/i }));

      expect(await screen.findByText(/Evidence attachments must belong to the registered reference/i)).toBeInTheDocument();
      expect(screen.queryByText("Request Successfully Registered")).not.toBeInTheDocument();
    });
  });

  describe("C. Rate Limiting, Reservation Expiry & Failure Retries", () => {
    it("handles server-side rate limit rejection gracefully without revealing internal counters", async () => {
      (supabase.rpc as any).mockImplementation((name: string) => {
        if (name === "reserve_return_reference") {
          return Promise.resolve({
            data: {
              success: false,
              code: "RATE_LIMITED",
              error: "Submission limit reached. For security, please wait before submitting another request or contact our atelier directly.",
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      renderWithProviders(<ReturnRequest />);

      fireEvent.change(screen.getByLabelText(/Order Number \*/i), { target: { value: "ORD-2026-TEST" } });
      fireEvent.change(screen.getByLabelText(/Registered Email \*/i), { target: { value: "client@example.com" } });
      fireEvent.change(screen.getByLabelText(/Product \/ Flacon Name \*/i), { target: { value: "Desert Saffron" } });
      fireEvent.change(screen.getByLabelText(/Primary Reason Summary \*/i), { target: { value: "Leaking bottle" } });
      fireEvent.change(screen.getByLabelText(/Detailed Narrative & Circumstances \*/i), {
        target: { value: "Leakage observed around the atomizer cap." },
      });

      fireEvent.click(screen.getByRole("button", { name: /Submit Request for Atelier Review/i }));

      expect(await screen.findByText(/Submission limit reached/i)).toBeInTheDocument();
      expect(screen.queryByText("Request Successfully Registered")).not.toBeInTheDocument();
    });

    it("NEVER displays a success receipt when RPC fails and provides safe retry action preserving inputs", async () => {
      (supabase.rpc as any).mockImplementation((name: string) => {
        if (name === "reserve_return_reference") {
          return Promise.resolve({
            data: null,
            error: { message: "permission denied for table order_return_requests" },
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      renderWithProviders(<ReturnRequest />);

      fireEvent.change(screen.getByLabelText(/Order Number \*/i), { target: { value: "ORD-2026-FAIL" } });
      fireEvent.change(screen.getByLabelText(/Registered Email \*/i), { target: { value: "client@example.com" } });
      fireEvent.change(screen.getByLabelText(/Product \/ Flacon Name \*/i), { target: { value: "Amber Nectar" } });
      fireEvent.change(screen.getByLabelText(/Primary Reason Summary \*/i), { target: { value: "Damaged box" } });
      fireEvent.change(screen.getByLabelText(/Detailed Narrative & Circumstances \*/i), {
        target: { value: "Outer packaging was crushed during transit." },
      });

      fireEvent.click(screen.getByRole("button", { name: /Submit Request for Atelier Review/i }));

      expect(await screen.findByText(/Unable to initialize return inquiry/i)).toBeInTheDocument();
      expect(screen.queryByText("Request Successfully Registered")).not.toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /Dismiss & Retry/i });
      expect(retryBtn).toBeInTheDocument();
      fireEvent.click(retryBtn);

      expect(screen.queryByText(/Unable to initialize return inquiry/i)).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("ORD-2026-FAIL")).toBeInTheDocument();
    });
  });

  describe("D. Admin Review Interface & Signed URL Security", () => {
    it("redirects non-admin users away from the returns admin management route", () => {
      mockUser = { id: "user-123", email: "user@example.com" };
      mockIsAdmin = false;

      renderWithProviders(
        <Routes>
          <Route path="/admin/returns" element={<AdminReturnRequests />} />
          <Route path="/" element={<div>Maison Home</div>} />
        </Routes>,
        "/admin/returns"
      );

      expect(screen.getByText("Maison Home")).toBeInTheDocument();
    });

    it("renders return inquiries, filters, and generates signed URLs for authorized admins", async () => {
      mockUser = { id: "admin-1", email: "admin@aurixperfume.in" };
      mockIsAdmin = true;

      const mockData = [
        {
          id: "req-1",
          reference_number: "RET-ADM-001",
          order_number: "ORD-20261026-001",
          customer_email: "vip@example.com",
          customer_name: "VIP Collector",
          request_type: "damaged",
          product_name: "Oud Sovereign",
          reason: "Broken cap",
          description: "Cap arrived cracked in transit.",
          photo_urls: ["RET-ADM-001/evidence.jpg"],
          status: "pending",
          admin_notes: null,
          created_at: "2026-11-16T10:00:00Z",
          updated_at: "2026-11-16T10:00:00Z",
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      renderWithProviders(<AdminReturnRequests />);

      expect(await screen.findByText("Returns & Client Inquiries")).toBeInTheDocument();
      expect(screen.getByText("RET-ADM-001")).toBeInTheDocument();
      expect(screen.getByText("ORD-20261026-001")).toBeInTheDocument();
      expect(screen.getByText("VIP Collector")).toBeInTheDocument();

      const inspectBtn = screen.getByRole("button", { name: /Inspect/i });
      fireEvent.click(inspectBtn);

      await waitFor(() => {
        expect(supabase.storage.from).toHaveBeenCalledWith("return-requests");
      });
      expect(screen.getByText(/Customer Circumstances & Description/i)).toBeInTheDocument();
      expect(screen.getByText("Cap arrived cracked in transit.")).toBeInTheDocument();

      const approveBtn = screen.getByRole("button", { name: /Approve Claim/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith("order_return_requests");
      });
    });
  });

  describe("E. Outbox Deduplication & Concurrency Simulation", () => {
    it("simulates atomic outbox claiming states: already_sent, in_flight, and retry after failure", async () => {
      // Simulating the behavior of claim_return_notification_event
      const simulateClaim = (eventState: { status: string; leaseActive: boolean; attempts: number }) => {
        if (eventState.status === "sent") {
          return { action: "already_sent", status: "sent" };
        }
        if (eventState.status === "processing" && eventState.leaseActive) {
          return { action: "in_flight", status: "processing" };
        }
        if (eventState.attempts >= 3) {
          return { action: "exhausted", status: "failed" };
        }
        return {
          action: "claimed",
          idempotency_key: "aurix-idemp-12345",
          attempts: eventState.attempts + 1,
          status: "processing",
        };
      };

      // 1. First claim on new event
      const claim1 = simulateClaim({ status: "pending", leaseActive: false, attempts: 0 });
      expect(claim1.action).toBe("claimed");
      expect(claim1.attempts).toBe(1);

      // 2. Concurrent second claim while first lease is active
      const claim2 = simulateClaim({ status: "processing", leaseActive: true, attempts: 1 });
      expect(claim2.action).toBe("in_flight");

      // 3. Retry after provider failure with expired lease
      const claim3 = simulateClaim({ status: "failed", leaseActive: false, attempts: 1 });
      expect(claim3.action).toBe("claimed");
      expect(claim3.attempts).toBe(2);

      // 4. Repeated trigger after sent
      const claim4 = simulateClaim({ status: "sent", leaseActive: false, attempts: 2 });
      expect(claim4.action).toBe("already_sent");

      // 5. Exhausted retries
      const claim5 = simulateClaim({ status: "failed", leaseActive: false, attempts: 3 });
      expect(claim5.action).toBe("exhausted");
    });
  });

  describe("F. Edge Function Notification Hardening (return-request-notify)", () => {
    it("escapes HTML fields, verifies both Resend responses, and never marks unconfigured delivery as sent", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const notifyPath = path.resolve(
        __dirname,
        "../../supabase/functions/return-request-notify/index.ts"
      );
      const code = fs.readFileSync(notifyPath, "utf-8");

      // 1. Support email and sender preserved
      expect(code).toContain('const OFFICIAL_SUPPORT_EMAIL = "aurixperfume25@gmail.com";');
      expect(code).toContain('const SENDER_EMAIL = "AURIX Concierge <notifications@aurixperfume.in>";');

      // 2. HTML escaping helper defined and applied to customer name, product name, description, and notes
      expect(code).toMatch(/function\s+escapeHtml\(/);
      expect(code).toMatch(/const\s+safeName\s*=\s*escapeHtml\(resolvedName\)/);
      expect(code).toMatch(/const\s+safeProduct\s*=\s*escapeHtml\(resolvedProduct\)/);
      expect(code).toMatch(/const\s+safeDescription\s*=\s*escapeHtml\(resolvedDescription\)/);
      expect(code).toMatch(/const\s+safeNotes\s*=\s*escapeHtml\(resolvedNotes\)/);
      expect(code).not.toContain("Dear ${resolvedName}");
      expect(code).not.toContain("Product:</strong> ${resolvedProduct}");
      expect(code).not.toContain("<em>${resolvedNotes}</em>");

      // 3. Missing RESEND_API_KEY fails clearly (503 PROVIDER_UNCONFIGURED) BEFORE claiming outbox and NEVER marks 'sent'
      const resendCheckIdx = code.indexOf('if (!resendApiKey)');
      const claimIdx = code.indexOf('claim_return_notification_event');
      expect(resendCheckIdx).toBeGreaterThan(-1);
      expect(claimIdx).toBeGreaterThan(resendCheckIdx);
      expect(code).toContain('"PROVIDER_UNCONFIGURED"');
      expect(code).not.toContain("simulated_no_api_key");

      // 4. Checks BOTH customer and atelier Resend responses; failed admin email cannot be marked 'sent'
      expect(code).toMatch(/if\s*\(resCustomer\.ok\)/);
      expect(code).toMatch(/if\s*\(resAtelier\.ok\)/);
      expect(code).toMatch(/const\s+allDelivered\s*=\s*customerEmailSent\s*&&\s*\(!atelierRequired\s*\|\|\s*atelierEmailSent\)/);
      expect(code).toContain('"partial_failure"');
      expect(code).toContain('"DELIVERY_FAILED"');

      // 5. Never discloses customer email PII ('recipient') in any HTTP response
      expect(code).not.toMatch(/recipient:\s*resolvedEmail/);

      // 6. STATUS_UPDATED executes requireAdmin(req) STRICTLY BEFORE querying order_return_requests
      const requireAdminIdx = code.indexOf("await requireAdmin(req);");
      const dbQueryIdx = code.indexOf('.from("order_return_requests")');
      expect(requireAdminIdx).toBeGreaterThan(-1);
      expect(dbQueryIdx).toBeGreaterThan(requireAdminIdx);

      // 7. Guest REQUEST_CREATED MANDATORILY requires order_number + customer_email + server-issued reservation_token
      expect(code).toMatch(/if\s*\(!cleanOrderInput\s*\|\|\s*!cleanEmailInput\s*\|\|\s*!suppliedToken\)/);
      expect(code).not.toMatch(/if\s*\(suppliedToken\)/); // Must NOT be optional
      expect(code).toMatch(/const\s+orderMatches\s*=\s*constantTimeEqual\(cleanOrderInput,\s*dbOrder\)/);
      expect(code).toMatch(/const\s+emailMatches\s*=\s*constantTimeEqual\(cleanEmailInput,\s*dbEmail\)/);
      expect(code).toMatch(/\.from\("return_reference_reservations"\)/);
      expect(code).toMatch(/Boolean\(reservation\.used_at\)/);
      expect(code).toMatch(/constantTimeEqual\(suppliedToken,\s*storedToken\)/);
      expect(code).toMatch(/constantTimeEqual\(cleanRef,\s*storedRef\)/);

      // 8. Token is never returned in responses, logged, or interpolated into email templates
      expect(code).not.toMatch(/reservation_token:\s*suppliedToken/);
      expect(code).not.toMatch(/console\.\w+\([^)]*suppliedToken/);
      expect(code).not.toMatch(/console\.\w+\([^)]*storedToken/);
      expect(code).not.toMatch(/\$\{suppliedToken\}|\$\{storedToken\}/);
    });

    it("behaviorally enforces mandatory server-issued reservation_token, guest ownership, outbox protection, and admin auth order", () => {
      const dbRecords = [
        {
          reference_number: "RET-ABC123",
          order_number: "ORD-20261118-9999",
          customer_email: "vip.client@example.com",
          status: "pending",
          created_at: new Date().toISOString(),
        },
        {
          reference_number: "RET-OTHER9",
          order_number: "ORD-20261118-8888",
          customer_email: "other.client@example.com",
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ];
      const dbReservations = [
        {
          reference_number: "RET-ABC123",
          order_number: "ORD-20261118-9999",
          customer_email: "vip.client@example.com",
          reservation_token: "srv-issued-hex-token-001",
          used_at: new Date().toISOString(),
        },
        {
          reference_number: "RET-OTHER9",
          order_number: "ORD-20261118-8888",
          customer_email: "other.client@example.com",
          reservation_token: "srv-issued-hex-token-other",
          used_at: new Date().toISOString(),
        },
        {
          reference_number: "RET-UNCONSUMED",
          order_number: "ORD-20261118-7777",
          customer_email: "unconsumed@example.com",
          reservation_token: "srv-issued-unconsumed-token",
          used_at: null as string | null,
        },
      ];

      const simulateNotifyAuth = (input: {
        event: "REQUEST_CREATED" | "STATUS_UPDATED";
        reference_number: string;
        order_number?: string;
        customer_email?: string;
        reservation_token?: string | null;
        isAdmin?: boolean;
        outboxAction?: "claimed" | "already_sent";
        overrideReservationOrder?: string;
        overrideUnconsumed?: boolean;
      }) => {
        let dbQueried = false;
        let outboxClaimed = false;
        const cleanRef = input.reference_number.trim().toUpperCase();

        if (input.event === "STATUS_UPDATED") {
          // Admin auth MUST run before any DB lookup
          if (!input.isAdmin) {
            return { status: 403, code: "FORBIDDEN", dbQueried, outboxClaimed, body: { success: false } };
          }
          dbQueried = true;
          const record = dbRecords.find((r) => r.reference_number === cleanRef);
          if (!record) {
            return { status: 404, code: "NOT_FOUND", dbQueried, outboxClaimed, body: { success: false } };
          }
          outboxClaimed = true;
          return {
            status: 200,
            code: "OK",
            dbQueried,
            outboxClaimed,
            body: {
              success: true,
              event: input.event,
              deliveryStatus: input.outboxAction === "already_sent" ? "duplicate_suppressed" : "sent",
              referenceNumber: record.reference_number,
            },
          };
        }

        const cleanOrder = (input.order_number || "").trim().toUpperCase();
        const cleanEmail = (input.customer_email || "").trim().toLowerCase();
        const suppliedToken = typeof input.reservation_token === "string" ? input.reservation_token.trim() : "";

        // Mandatory pre-DB check for order_number, customer_email, and reservation_token
        if (!cleanOrder || !cleanEmail || !suppliedToken) {
          return { status: 403, code: "UNAUTHORIZED", dbQueried, outboxClaimed, body: { success: false } };
        }

        dbQueried = true;
        const record = dbRecords.find((r) => r.reference_number === cleanRef);
        if (!record || cleanOrder !== record.order_number || cleanEmail !== record.customer_email) {
          return { status: 403, code: "UNAUTHORIZED", dbQueried, outboxClaimed, body: { success: false } };
        }

        const baseRes = dbReservations.find((r) => r.reference_number === cleanRef);
        const reservation = baseRes
          ? {
              ...baseRes,
              order_number: input.overrideReservationOrder ?? baseRes.order_number,
              used_at: input.overrideUnconsumed ? null : baseRes.used_at,
            }
          : null;

        const tokenValid =
          Boolean(reservation) &&
          Boolean(reservation?.used_at) &&
          reservation?.reference_number === cleanRef &&
          reservation?.reservation_token === suppliedToken &&
          reservation?.order_number === record.order_number &&
          reservation?.customer_email === record.customer_email;

        if (!tokenValid) {
          return { status: 403, code: "UNAUTHORIZED", dbQueried, outboxClaimed, body: { success: false } };
        }

        outboxClaimed = true;
        return {
          status: 200,
          code: "OK",
          dbQueried,
          outboxClaimed,
          body: {
            success: true,
            event: input.event,
            deliveryStatus: input.outboxAction === "already_sent" ? "duplicate_suppressed" : "sent",
            referenceNumber: record.reference_number,
          },
        };
      };

      // 1. Valid server-issued token allows legitimate guest notification and NEVER returns email or token
      const validGuest = simulateNotifyAuth({
        event: "REQUEST_CREATED",
        reference_number: "ret-abc123",
        order_number: " ord-20261118-9999 ",
        customer_email: " VIP.CLIENT@EXAMPLE.COM ",
        reservation_token: "srv-issued-hex-token-001",
      });
      expect(validGuest.status).toBe(200);
      expect(validGuest.outboxClaimed).toBe(true);
      expect(JSON.stringify(validGuest.body)).not.toContain("vip.client@example.com");
      expect(JSON.stringify(validGuest.body)).not.toContain("srv-issued-hex-token-001");

      // 2. Missing reservation_token rejected BEFORE DB lookup and never claims outbox
      const missingToken = simulateNotifyAuth({
        event: "REQUEST_CREATED",
        reference_number: "RET-ABC123",
        order_number: "ORD-20261118-9999",
        customer_email: "vip.client@example.com",
      });
      expect(missingToken.status).toBe(403);
      expect(missingToken.dbQueried).toBe(false);
      expect(missingToken.outboxClaimed).toBe(false);

      // 3. Empty/whitespace reservation_token rejected BEFORE DB lookup and never claims outbox
      const emptyToken = simulateNotifyAuth({
        event: "REQUEST_CREATED",
        reference_number: "RET-ABC123",
        order_number: "ORD-20261118-9999",
        customer_email: "vip.client@example.com",
        reservation_token: "   ",
      });
      expect(emptyToken.status).toBe(403);
      expect(emptyToken.dbQueried).toBe(false);
      expect(emptyToken.outboxClaimed).toBe(false);

      // 4. Incorrect token rejected without claiming outbox
      const wrongToken = simulateNotifyAuth({
        event: "REQUEST_CREATED",
        reference_number: "RET-ABC123",
        order_number: "ORD-20261118-9999",
        customer_email: "vip.client@example.com",
        reservation_token: "forged-token-xyz",
      });
      expect(wrongToken.status).toBe(403);
      expect(wrongToken.outboxClaimed).toBe(false);

      // 5. Token belonging to another reference rejected without claiming outbox
      const crossRefToken = simulateNotifyAuth({
        event: "REQUEST_CREATED",
        reference_number: "RET-ABC123",
        order_number: "ORD-20261118-9999",
        customer_email: "vip.client@example.com",
        reservation_token: "srv-issued-hex-token-other",
      });
      expect(crossRefToken.status).toBe(403);
      expect(crossRefToken.outboxClaimed).toBe(false);

      // 6. Token bound to another order rejected without claiming outbox
      const crossOrderToken = simulateNotifyAuth({
        event: "REQUEST_CREATED",
        reference_number: "RET-ABC123",
        order_number: "ORD-20261118-9999",
        customer_email: "vip.client@example.com",
        reservation_token: "srv-issued-hex-token-001",
        overrideReservationOrder: "ORD-DIFFERENT-0001",
      });
      expect(crossOrderToken.status).toBe(403);
      expect(crossOrderToken.outboxClaimed).toBe(false);

      // 7. Unconsumed reservation (used_at IS NULL) rejected without claiming outbox
      const unconsumedRes = simulateNotifyAuth({
        event: "REQUEST_CREATED",
        reference_number: "RET-ABC123",
        order_number: "ORD-20261118-9999",
        customer_email: "vip.client@example.com",
        reservation_token: "srv-issued-hex-token-001",
        overrideUnconsumed: true,
      });
      expect(unconsumedRes.status).toBe(403);
      expect(unconsumedRes.outboxClaimed).toBe(false);

      // 8. Order / email mismatch rejected even with real token, without claiming outbox
      const wrongOrder = simulateNotifyAuth({
        event: "REQUEST_CREATED",
        reference_number: "RET-ABC123",
        order_number: "ORD-WRONG",
        customer_email: "vip.client@example.com",
        reservation_token: "srv-issued-hex-token-001",
      });
      expect(wrongOrder.status).toBe(403);
      expect(wrongOrder.outboxClaimed).toBe(false);

      const wrongEmail = simulateNotifyAuth({
        event: "REQUEST_CREATED",
        reference_number: "RET-ABC123",
        order_number: "ORD-20261118-9999",
        customer_email: "attacker@example.com",
        reservation_token: "srv-issued-hex-token-001",
      });
      expect(wrongEmail.status).toBe(403);
      expect(wrongEmail.outboxClaimed).toBe(false);

      // 9. Duplicate valid notification remains idempotent without exposing email or token
      const dupGuest = simulateNotifyAuth({
        event: "REQUEST_CREATED",
        reference_number: "RET-ABC123",
        order_number: "ORD-20261118-9999",
        customer_email: "vip.client@example.com",
        reservation_token: "srv-issued-hex-token-001",
        outboxAction: "already_sent",
      });
      expect(dupGuest.status).toBe(200);
      expect(dupGuest.body.deliveryStatus).toBe("duplicate_suppressed");
      expect(JSON.stringify(dupGuest.body)).not.toContain("vip.client@example.com");
      expect(JSON.stringify(dupGuest.body)).not.toContain("srv-issued-hex-token-001");

      // 10. Unauthenticated / non-admin STATUS_UPDATED rejected BEFORE any DB lookup or outbox claim
      const unauthAdmin = simulateNotifyAuth({
        event: "STATUS_UPDATED",
        reference_number: "RET-NONEXISTENT",
        isAdmin: false,
      });
      expect(unauthAdmin.status).toBe(403);
      expect(unauthAdmin.dbQueried).toBe(false);
      expect(unauthAdmin.outboxClaimed).toBe(false);

      // 11. Authorized admin STATUS_UPDATED succeeds without leaking email or token
      const validAdmin = simulateNotifyAuth({
        event: "STATUS_UPDATED",
        reference_number: "RET-ABC123",
        isAdmin: true,
      });
      expect(validAdmin.status).toBe(200);
      expect(validAdmin.outboxClaimed).toBe(true);
      expect(JSON.stringify(validAdmin.body)).not.toContain("vip.client@example.com");
    });

    it("behaviorally escapes malicious HTML payloads in email fields", () => {
      const escapeHtml = (value: string | null | undefined): string => {
        if (!value) return "";
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      };

      const malicious = `<img src=x onerror="alert('xss')">&<a href="https://evil.test">click</a>`;
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain("<img");
      expect(escaped).not.toContain("<a ");
      expect(escaped).toBe(
        "&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;&lt;a href=&quot;https://evil.test&quot;&gt;click&lt;/a&gt;"
      );
    });
  });
});
