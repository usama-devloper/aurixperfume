import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Terms from "@/pages/Terms";
import Shipping from "@/pages/Shipping";
import FAQ from "@/pages/FAQ";
import ReturnRequest from "@/pages/ReturnRequest";
import Careers from "@/pages/Careers";
import Footer from "@/components/layout/Footer";
import Auth from "@/pages/Auth";
import Cart from "@/pages/Cart";
import OrderTracking from "@/pages/OrderTracking";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [{ id: "test-id" }], error: null }) }),
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockImplementation((name: string) => {
      if (name === "reserve_return_reference") {
        return Promise.resolve({
          data: { success: true, reference_number: "RET-2026-TEST", reservation_token: "test-token" },
          error: null,
        });
      }
      if (name === "submit_return_request") {
        return Promise.resolve({
          data: { success: true, reference_number: "RET-2026-TEST" },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: "test/path.jpg" }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/test.jpg" } }),
      })),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isAdmin: false,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

// Mock CartContext
vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    items: [
      {
        product: {
          id: 1,
          name: "Sovereign Oud",
          price: 4200,
          brand: "AURIX",
          image: "/test.jpg",
          category: "woody",
          size: { value: "50", unit: "ml" },
        },
        quantity: 1,
      },
    ],
    totalItems: 1,
    totalAmount: 4200,
    clearCart: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    restoreItem: vi.fn(),
    lastRemovedItem: null,
  }),
}));

const renderWithProviders = (ui: React.ReactElement, initialEntries?: string[]) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("Phase 5 Comprehensive Improvements & Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.rpc as any).mockImplementation((name: string) => {
      if (name === "reserve_return_reference") {
        return Promise.resolve({
          data: { success: true, reference_number: "RET-2026-TEST", reservation_token: "test-token" },
          error: null,
        });
      }
      if (name === "submit_return_request") {
        return Promise.resolve({
          data: { success: true, reference_number: "RET-2026-TEST" },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  /* ----------------------------------------------------
   * 1. Legal Pages: Privacy Policy & Terms
   * ---------------------------------------------------- */
  describe("A. Legal Pages (Privacy Policy & Terms)", () => {
    it("renders Privacy Policy page with confirmed data disclosures and official contact email", () => {
      renderWithProviders(<PrivacyPolicy />);

      expect(screen.getByRole("heading", { name: "Privacy Policy", level: 1 })).toBeInTheDocument();
      expect(screen.getByText("1. Information We Collect")).toBeInTheDocument();
      expect(screen.getByText("2. Payment & Cardholder Security")).toBeInTheDocument();
      expect(screen.getByText("3. Logistics Partners & Data Sharing")).toBeInTheDocument();
      expect(screen.getByText("4. Public Order Tracking Privacy")).toBeInTheDocument();
      expect(screen.getByText("5. Local Storage & Website Preferences")).toBeInTheDocument();
      expect(screen.getAllByText("aurixperfume25@gmail.com").length).toBeGreaterThanOrEqual(1);
    });

    it("renders Terms & Conditions page with governing articles and currency INR", () => {
      renderWithProviders(<Terms />);

      expect(screen.getByRole("heading", { name: "Terms & Conditions", level: 1 })).toBeInTheDocument();
      expect(screen.getByText("1. Maison Introduction & Acceptance")).toBeInTheDocument();
      expect(screen.getByText("3. Pricing, Orders & Currency")).toBeInTheDocument();
      expect(screen.getByText("5. Shipping, Dispatch & Delivery")).toBeInTheDocument();
      expect(screen.getByText("6. Returns, Exchanges & Issue Resolution")).toBeInTheDocument();
      expect(screen.getAllByText("aurixperfume25@gmail.com").length).toBeGreaterThanOrEqual(1);
    });

    it("renders Auth page with active links for Terms of Service and Privacy Policy", () => {
      renderWithProviders(<Auth />);

      const termsLink = screen.getByRole("link", { name: "Terms of Service" });
      const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });

      expect(termsLink).toHaveAttribute("href", "/terms");
      expect(privacyLink).toHaveAttribute("href", "/privacy-policy");
    });
  });

  /* ----------------------------------------------------
   * 2. Shipping Page
   * ---------------------------------------------------- */
  describe("B. Shipping & Delivery Page", () => {
    it("renders Shipping page with ₹1,000 complimentary threshold, ₹400 fee, and Ahmedabad origin", () => {
      renderWithProviders(<Shipping />);

      expect(screen.getByRole("heading", { name: "Shipping & Delivery", level: 1 })).toBeInTheDocument();
      expect(screen.getByText("Complimentary Domestic Shipping")).toBeInTheDocument();
      expect(screen.getByText("₹0 (Free)")).toBeInTheDocument();
      expect(screen.getByText("₹400")).toBeInTheDocument();
      expect(screen.getByText(/Ahmedabad - 380001, Gujarat, India/i)).toBeInTheDocument();
      expect(screen.getByText("FedEx Express")).toBeInTheDocument();
      expect(screen.getByText("Delhivery")).toBeInTheDocument();
    });

    it("provides link to Order Tracking portal and Return Request system", () => {
      renderWithProviders(<Shipping />);

      const trackingLink = screen.getByRole("link", { name: /Open Track Order Portal/i });
      expect(trackingLink).toHaveAttribute("href", "/order-tracking");

      const returnLink = screen.getByRole("link", { name: /Return & Issue Request Portal/i });
      expect(returnLink).toHaveAttribute("href", "/return-request");
    });
  });

  /* ----------------------------------------------------
   * 3. FAQ Page
   * ---------------------------------------------------- */
  describe("C. Frequently Asked Questions Page", () => {
    it("renders FAQ header, category pills, search input, and expandable questions", async () => {
      renderWithProviders(<FAQ />);

      expect(screen.getByRole("heading", { name: "Frequently Asked Questions", level: 1 })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search questions by keyword/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Fragrance & Craft" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Shipping & Delivery" })).toBeInTheDocument();

      // Check specific question renders
      expect(screen.getByText(/What is the difference between Eau de Parfum/i)).toBeInTheDocument();
    });

    it("filters questions dynamically when user types into the search box", () => {
      renderWithProviders(<FAQ />);

      const searchInput = screen.getByPlaceholderText(/Search questions by keyword/i);
      fireEvent.change(searchInput, { target: { value: "maceration" } });

      expect(screen.getByText(/What is perfume maceration/i)).toBeInTheDocument();
      expect(screen.queryByText(/Which courier partners deliver/i)).not.toBeInTheDocument();
    });
  });

  /* ----------------------------------------------------
   * 4. Return & Issue Request System
   * ---------------------------------------------------- */
  describe("D. Return & Issue Request System", () => {
    it("renders form with required fields, policy charter notice, and request categories", () => {
      renderWithProviders(<ReturnRequest />);

      expect(screen.getByRole("heading", { name: "Return & Issue Request", level: 1 })).toBeInTheDocument();
      expect(screen.getByLabelText(/Order Number \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Registered Email \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Product \/ Flacon Name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Detailed Narrative & Circumstances \*/i)).toBeInTheDocument();
      expect(screen.getByText(/Atelier Return & Resolution Charter/i)).toBeInTheDocument();
    });

    it("validates empty submission and prevents dispatch without order number or email", async () => {
      renderWithProviders(<ReturnRequest />);

      const submitBtn = screen.getByRole("button", { name: /Submit Request for Atelier Review/i });
      fireEvent.click(submitBtn);

      // Verify Supabase insert was not called on invalid inputs
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("successfully submits request and presents official confirmation with generated reference code", async () => {
      renderWithProviders(<ReturnRequest />);

      fireEvent.change(screen.getByLabelText(/Order Number \*/i), { target: { value: "ORD-2026-TEST" } });
      fireEvent.change(screen.getByLabelText(/Registered Email \*/i), { target: { value: "patron@example.com" } });
      fireEvent.change(screen.getByLabelText(/Product \/ Flacon Name \*/i), { target: { value: "Sovereign Oud" } });
      fireEvent.change(screen.getByLabelText(/Primary Reason Summary \*/i), { target: { value: "Unopened sealed return" } });
      fireEvent.change(screen.getByLabelText(/Detailed Narrative & Circumstances \*/i), {
        target: { value: "The flacon box remains completely sealed in original cellophane with unbroken seal." },
      });

      const submitBtn = screen.getByRole("button", { name: /Submit Request for Atelier Review/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Request Successfully Registered")).toBeInTheDocument();
      });

      expect(screen.getByText(/RET-/i)).toBeInTheDocument();
      expect(screen.getByText("ORD-2026-TEST")).toBeInTheDocument();
      expect(screen.getByText("patron@example.com")).toBeInTheDocument();
    });
  });

  /* ----------------------------------------------------
   * 5. Careers Page ("Join Our Atelier")
   * ---------------------------------------------------- */
  describe("E. Careers Page (Join Our Atelier)", () => {
    it("renders truthful Join Our Atelier page without fictional Paris/London jobs or dead Apply buttons", () => {
      renderWithProviders(<Careers />);

      expect(screen.getByRole("heading", { name: "Join Our Atelier", level: 1 })).toBeInTheDocument();
      expect(screen.getByText("Current Vacancy Status")).toBeInTheDocument();
      expect(screen.getByText(/no active public vacancies at this time/i)).toBeInTheDocument();
      expect(screen.getAllByText("aurixperfume25@gmail.com").length).toBeGreaterThanOrEqual(1);

      // Ensure old fictional roles are completely eliminated
      expect(screen.queryByText("Senior Perfumer")).not.toBeInTheDocument();
      expect(screen.queryByText("Paris, France")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Apply Now" })).not.toBeInTheDocument();
    });
  });

  /* ----------------------------------------------------
   * 6. Order Tracking Deep-Link URL Handling
   * ---------------------------------------------------- */
  describe("F. Order Tracking Deep-Link Integration", () => {
    it("automatically reads ?id= parameter and executes lookup on mount", async () => {
      // Simulate browser URL containing ?id=ORD-DEEPLINK-123
      window.history.pushState({}, "", "/order-tracking?id=ORD-DEEPLINK-123");

      renderWithProviders(<OrderTracking />, ["/order-tracking?id=ORD-DEEPLINK-123"]);

      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith("track_order", {
          p_query: "ORD-DEEPLINK-123",
        });
      });

      // Cleanup window URL
      window.history.pushState({}, "", "/");
    });
  });

  /* ----------------------------------------------------
   * 7. Footer Navigation & Social Fallbacks
   * ---------------------------------------------------- */
  describe("G. Footer Navigation & Social Links", () => {
    it("renders active registered routes for Privacy, Terms, Shipping, FAQ, Return Request, and Careers", () => {
      renderWithProviders(<Footer />);

      expect(screen.getByRole("link", { name: "Terms & Conditions" })).toHaveAttribute("href", "/terms");
      expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy-policy");
      expect(screen.getByRole("link", { name: "Shipping & Delivery" })).toHaveAttribute("href", "/shipping");
      expect(screen.getByRole("link", { name: "Return Request" })).toHaveAttribute("href", "/return-request");
      expect(screen.getByRole("link", { name: "Frequently Asked" })).toHaveAttribute("href", "/faq");
      expect(screen.getByRole("link", { name: "Join Our Atelier" })).toHaveAttribute("href", "/careers");
    });

    it("does not render dead # anchors for missing social links", () => {
      renderWithProviders(<Footer />);

      const allLinks = screen.getAllByRole("link");
      allLinks.forEach((link) => {
        expect(link.getAttribute("href")).not.toBe("#");
      });
    });
  });

  /* ----------------------------------------------------
   * 8. Cart Dark-Mode Styling
   * ---------------------------------------------------- */
  describe("H. Cart Checkout Luxury Button Styling", () => {
    it("uses btn-gold styling on Proceed to Checkout button", () => {
      renderWithProviders(<Cart />);

      const checkoutBtn = screen.getByRole("button", { name: /Proceed to Checkout/i });
      expect(checkoutBtn.className).toContain("btn-gold");
      expect(checkoutBtn.className).not.toContain("bg-[#1C1917]");
    });
  });
});
