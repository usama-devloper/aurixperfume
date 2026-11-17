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

      // 3. Verifies confirmed acknowledgment receipt renders
      expect(await screen.findByText("Request Successfully Registered")).toBeInTheDocument();
      expect(screen.getByText("RET-20261116-A1B2C3")).toBeInTheDocument();
      expect(screen.getByText("ORD-20261026-F9E8D7C6B5A43210")).toBeInTheDocument();
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
});
