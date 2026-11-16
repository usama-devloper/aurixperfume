import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import OrderTracking from "@/pages/OrderTracking";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
const mockRpcCalls: { method: string; args: unknown[] }[] = [];
const mockTableCalls: { method: string; args: unknown[] }[] = [];

let rpcResponse: { data: any; error: any } = { data: null, error: null };
let tableResponse: { data: any; error: any } = { data: null, error: null };

const tableBuilder: any = {
  select: vi.fn((...args) => {
    mockTableCalls.push({ method: "select", args });
    return tableBuilder;
  }),
  or: vi.fn((...args) => {
    mockTableCalls.push({ method: "or", args });
    return tableBuilder;
  }),
  eq: vi.fn((...args) => {
    mockTableCalls.push({ method: "eq", args });
    return tableBuilder;
  }),
  limit: vi.fn((...args) => {
    mockTableCalls.push({ method: "limit", args });
    return tableBuilder;
  }),
  maybeSingle: vi.fn(async () => tableResponse),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async (...args) => {
      mockRpcCalls.push({ method: "rpc", args });
      return rpcResponse;
    }),
    from: vi.fn((table: string) => {
      mockTableCalls.push({ method: "from", args: [table] });
      return tableBuilder;
    }),
  },
}));

describe("OrderTracking — Comprehensive Functional & Accessibility Tests", () => {
  beforeEach(() => {
    mockRpcCalls.length = 0;
    mockTableCalls.length = 0;
    vi.clearAllMocks();
    rpcResponse = { data: null, error: null };
    tableResponse = { data: null, error: null };
  });

  const submitQuery = async (query: string) => {
    const input = screen.getByLabelText(/Order ID or Tracking Number/i);
    fireEvent.change(input, { target: { value: query } });
    const button = screen.getByRole("button", { name: /track/i });
    fireEvent.click(button);
  };

  describe("A. Successful RPC Lookup", () => {
    it("calls track_order RPC with exact p_query parameter and renders sanitized order details", async () => {
      rpcResponse = {
        data: [
          {
            order_number: "ORD-20261026-F9E8D7C6B5A43210",
            tracking_number: "FDX-982347102938",
            shipping_carrier: "fedex",
            status: "shipped",
            estimated_delivery: "2026-11-12T18:00:00Z",
            created_at: "2026-11-04T10:30:00Z",
            updated_at: "2026-11-05T14:45:00Z",
          },
        ],
        error: null,
      };

      render(<OrderTracking />);
      await submitQuery("ORD-20261026-F9E8D7C6B5A43210");

      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith("track_order", {
          p_query: "ORD-20261026-F9E8D7C6B5A43210",
        });
      });

      // Verify sanitized order details render correctly
      expect(await screen.findByText("Order Status Summary")).toBeInTheDocument();
      expect(screen.getAllByText("ORD-20261026-F9E8D7C6B5A43210").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("FedEx Express")).toBeInTheDocument();
      expect(screen.getByText("In Transit")).toBeInTheDocument();
      expect(screen.getByText(/Waybill tracking code:/i)).toBeInTheDocument();

      // Ensure fallback was NOT called when RPC succeeded
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe("B. Fallback Lookup", () => {
    it("falls back to orders table when RPC returns empty array, using exact select columns, .eq() matching, and .limit(1)", async () => {
      rpcResponse = { data: [], error: null };
      tableResponse = {
        data: {
          id: "ord-uuid-1234",
          order_number: "ORD-20261026-FALLBACK01",
          tracking_number: "DLV-998877",
          shipping_carrier: "delhivery",
          status: "processing",
          estimated_delivery: "2026-11-15T00:00:00Z",
          created_at: "2026-11-05T00:00:00Z",
          updated_at: "2026-11-06T00:00:00Z",
        },
        error: null,
      };

      render(<OrderTracking />);
      await submitQuery("ORD-20261026-FALLBACK01");

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith("orders");
      });

      // Verify exact columns requested in select
      expect(tableBuilder.select).toHaveBeenCalledWith(
        "id, order_number, tracking_number, shipping_carrier, status, estimated_delivery, created_at, updated_at"
      );

      // Verify exact matching without wildcards
      expect(tableBuilder.or).toHaveBeenCalledWith(
        "order_number.eq.ORD-20261026-FALLBACK01,tracking_number.eq.ORD-20261026-FALLBACK01"
      );
      expect(tableBuilder.limit).toHaveBeenCalledWith(1);
      expect(tableBuilder.maybeSingle).toHaveBeenCalled();

      // Verify rendered result
      expect(await screen.findByText("Order Status Summary")).toBeInTheDocument();
      expect(screen.getAllByText("ORD-20261026-FALLBACK01").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Delhivery")).toBeInTheDocument();
      expect(screen.getByText("Preparation")).toBeInTheDocument();
    });
  });

  describe("C. Order Statuses & Timeline Progression", () => {
    const statuses = [
      {
        status: "pending",
        label: "Order Placed",
        notice: /scheduled for atelier compounding/i,
      },
      {
        status: "processing",
        label: "Preparation",
        notice: /hand-bottled, inspected, and packaged/i,
      },
      {
        status: "shipped",
        label: "In Transit",
        notice: /handed over to our courier partner/i,
      },
      {
        status: "delivered",
        label: "Delivered",
        notice: /shipment has arrived at your destination/i,
      },
    ];

    statuses.forEach(({ status, label, notice }) => {
      it(`renders timeline and narrative correctly for status "${status}"`, async () => {
        rpcResponse = {
          data: [
            {
              order_number: `ORD-TEST-${status.toUpperCase()}`,
              tracking_number: "TRK-12345",
              shipping_carrier: "dhl",
              status,
              estimated_delivery: "2026-11-20T00:00:00Z",
              created_at: "2026-11-01T00:00:00Z",
              updated_at: "2026-11-02T00:00:00Z",
            },
          ],
          error: null,
        };

        render(<OrderTracking />);
        await submitQuery(`ORD-TEST-${status.toUpperCase()}`);

        expect(await screen.findByText("Order Status Summary")).toBeInTheDocument();
        expect(screen.getAllByText(`ORD-TEST-${status.toUpperCase()}`).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByText(notice)).toBeInTheDocument();

        // Verify active step semantics (aria-current="step")
        const activeStep = screen.getByRole("listitem", { current: "step" });
        expect(activeStep).toHaveTextContent(label);
      });
    });
  });

  describe("D. Carrier Information & Allowlist Links", () => {
    it("maps supported carriers to formal concierge labels", async () => {
      const carriers = [
        { code: "fedex", label: "FedEx Express" },
        { code: "dhl", label: "DHL Express" },
        { code: "dtdc", label: "DTDC Express" },
        { code: "ups", label: "UPS" },
        { code: "bluedart", label: "Blue Dart" },
        { code: "delhivery", label: "Delhivery" },
      ];

      for (const { code, label } of carriers) {
        rpcResponse = {
          data: [
            {
              order_number: `ORD-${code.toUpperCase()}`,
              tracking_number: "TRK-001",
              shipping_carrier: code,
              status: "shipped",
              estimated_delivery: null,
              created_at: "2026-11-01T00:00:00Z",
              updated_at: "2026-11-02T00:00:00Z",
            },
          ],
          error: null,
        };

        const { unmount } = render(<OrderTracking />);
        await submitQuery(`ORD-${code.toUpperCase()}`);

        expect(await screen.findByText("Order Status Summary")).toBeInTheDocument();
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      }
    });

    it("renders verified official landing page with secure rel and target without query parameters for each supported carrier", async () => {
      const verifiedDestinations = [
        { code: "fedex", url: "https://www.fedex.com/en-in/tracking.html" },
        { code: "ups", url: "https://www.ups.com/in/en/home" },
        { code: "usps", url: "https://tools.usps.com/go/TrackAction" },
        { code: "dhl", url: "https://www.dhl.com/in-en/home/tracking.html" },
        { code: "delhivery", url: "https://www.delhivery.com/tracking" },
      ];

      for (const { code, url } of verifiedDestinations) {
        rpcResponse = {
          data: [
            {
              order_number: `ORD-${code.toUpperCase()}-LINK`,
              tracking_number: "782346123456",
              shipping_carrier: code,
              status: "shipped",
              estimated_delivery: "2026-11-15T00:00:00Z",
              created_at: "2026-11-01T00:00:00Z",
              updated_at: "2026-11-02T00:00:00Z",
            },
          ],
          error: null,
        };

        const { unmount } = render(<OrderTracking />);
        await submitQuery(`ORD-${code.toUpperCase()}-LINK`);

        const link = await screen.findByRole("link", { name: /track on carrier portal/i });
        expect(link).toHaveAttribute("href", url);
        // Verify no tracking numbers or query parameters appended
        expect(link.getAttribute("href")).not.toContain("?");
        expect(link.getAttribute("href")).not.toContain("782346123456");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
        unmount();
      }
    });

    it("omits external tracking link for unknown/unsupported carriers while safely displaying the label", async () => {
      rpcResponse = {
        data: [
          {
            order_number: "ORD-UNKNOWN-CARRIER",
            tracking_number: "XYZ-999",
            shipping_carrier: "custom_regional_courier",
            status: "shipped",
            estimated_delivery: null,
            created_at: "2026-11-01T00:00:00Z",
            updated_at: "2026-11-02T00:00:00Z",
          },
        ],
        error: null,
      };

      render(<OrderTracking />);
      await submitQuery("ORD-UNKNOWN-CARRIER");

      expect(await screen.findByText("Order Status Summary")).toBeInTheDocument();
      expect(screen.getByText("custom_regional_courier")).toBeInTheDocument();
      // External link must NOT be rendered for untrusted carrier
      expect(screen.queryByRole("link", { name: /track on carrier portal/i })).not.toBeInTheDocument();
    });

    it("omits external link and displays 'Pending dispatch' when tracking number or estimated delivery is null", async () => {
      rpcResponse = {
        data: [
          {
            order_number: "ORD-NO-TRACKING",
            tracking_number: null,
            shipping_carrier: null,
            status: "pending",
            estimated_delivery: null,
            created_at: "2026-11-01T00:00:00Z",
            updated_at: "2026-11-02T00:00:00Z",
          },
        ],
        error: null,
      };

      render(<OrderTracking />);
      await submitQuery("ORD-NO-TRACKING");

      expect(await screen.findByText("Order Status Summary")).toBeInTheDocument();
      expect(screen.getAllByText("ORD-NO-TRACKING").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Dedicated courier packaging")).toBeInTheDocument();
      expect(screen.getByText("Pending dispatch")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /track on carrier portal/i })).not.toBeInTheDocument();
    });
  });

  describe("E. Failure Handling & Error Privacy", () => {
    it("validates empty or whitespace-only input client-side without calling Supabase", async () => {
      render(<OrderTracking />);
      await submitQuery("   ");

      expect(await screen.findByText("Please enter a tracking number or order ID")).toBeInTheDocument();
      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("displays uniform generic error message when order is not found without leaking existence", async () => {
      rpcResponse = { data: null, error: null };
      tableResponse = { data: null, error: null };

      render(<OrderTracking />);
      await submitQuery("ORD-NONEXISTENT");

      expect(
        await screen.findByText("Order not found. Please check your tracking number or order ID and try again.")
      ).toBeInTheDocument();
      // Results card must not render
      expect(screen.queryByText("Order Status Summary")).not.toBeInTheDocument();
    });

    it("displays generic user-facing message when Supabase throws an unexpected error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error("Fatal connection timeout"));

      render(<OrderTracking />);
      await submitQuery("ORD-ERROR-TRIGGER");

      expect(
        await screen.findByText("Unable to fetch order details. Please try again later.")
      ).toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  describe("F. Accessibility & Long Reference Protection", () => {
    it("provides accessible form label, submit button role, and error live region (role='alert')", async () => {
      render(<OrderTracking />);
      const input = screen.getByLabelText("Order ID or Tracking Number");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("id", "searchQuery");

      const button = screen.getByRole("button", { name: /track/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("type", "submit");

      // Trigger error and check role="alert"
      fireEvent.click(button);
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Please enter a tracking number or order ID");
    });

    it("timeline contains aria-label='Order fulfillment progress' and list semantics", async () => {
      rpcResponse = {
        data: [
          {
            order_number: "ORD-20261026-F9E8D7C6B5A43210",
            tracking_number: "FDX-123",
            shipping_carrier: "fedex",
            status: "processing",
            estimated_delivery: "2026-11-10T00:00:00Z",
            created_at: "2026-11-01T00:00:00Z",
            updated_at: "2026-11-02T00:00:00Z",
          },
        ],
        error: null,
      };

      render(<OrderTracking />);
      await submitQuery("ORD-20261026-F9E8D7C6B5A43210");

      const timeline = await screen.findByRole("list", { name: "Order fulfillment progress" });
      expect(timeline).toBeInTheDocument();

      const items = screen.getAllByRole("listitem");
      expect(items.length).toBe(4);
    });

    it("handles long 31-character order references with break-all protection", async () => {
      const longRef = "ORD-20261026-F9E8D7C6B5A43210";
      rpcResponse = {
        data: [
          {
            order_number: longRef,
            tracking_number: "FDX-123456789012345",
            shipping_carrier: "fedex",
            status: "delivered",
            estimated_delivery: "2026-11-10T00:00:00Z",
            created_at: "2026-11-01T00:00:00Z",
            updated_at: "2026-11-02T00:00:00Z",
          },
        ],
        error: null,
      };

      render(<OrderTracking />);
      await submitQuery(longRef);

      expect(await screen.findByText("Order Status Summary")).toBeInTheDocument();
      const badges = screen.getAllByText(longRef);
      expect(badges.length).toBeGreaterThanOrEqual(1);
      // Ensure element has break-all class
      expect(badges[0].className).toContain("break-all");
    });
  });
});
