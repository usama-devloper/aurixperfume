import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OrderTracking from "./OrderTracking";

// Capture query builder calls
const calls: { method: string; args: unknown[] }[] = [];

const builder: any = {
  select: vi.fn((...a) => { calls.push({ method: "select", args: a }); return builder; }),
  or: vi.fn((...a) => { calls.push({ method: "or", args: a }); return builder; }),
  eq: vi.fn((...a) => { calls.push({ method: "eq", args: a }); return builder; }),
  ilike: vi.fn((...a) => { calls.push({ method: "ilike", args: a }); return builder; }),
  like: vi.fn((...a) => { calls.push({ method: "like", args: a }); return builder; }),
  limit: vi.fn((...a) => { calls.push({ method: "limit", args: a }); return builder; }),
  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      calls.push({ method: "from", args: [table] });
      return builder;
    }),
  },
}));

const submit = async (value: string) => {
  const input = screen.getByLabelText(/Order ID or Tracking Number/i);
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: /track/i }));
  await waitFor(() => expect(builder.maybeSingle).toHaveBeenCalled());
};

describe("OrderTracking — enumeration hardening", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
  });

  it("does NOT use wildcard ilike/like that would allow enumeration", async () => {
    render(<OrderTracking />);
    await submit("ORD-123");
    expect(builder.ilike).not.toHaveBeenCalled();
    expect(builder.like).not.toHaveBeenCalled();
    const anyWildcard = calls.some((c) =>
      c.args.some((a) => typeof a === "string" && a.includes("%"))
    );
    expect(anyWildcard).toBe(false);
  });

  it("uses exact-match .or() with eq filters on order_number and tracking_number", async () => {
    render(<OrderTracking />);
    await submit("ORD-ABC123");
    expect(builder.or).toHaveBeenCalledTimes(1);
    const filter = builder.or.mock.calls[0][0] as string;
    expect(filter).toBe("order_number.eq.ORD-ABC123,tracking_number.eq.ORD-ABC123");
    expect(filter).not.toMatch(/ilike|like|\*|%/i);
  });

  it("limits results to a single record to prevent bulk listing", async () => {
    render(<OrderTracking />);
    await submit("XYZ");
    expect(builder.limit).toHaveBeenCalledWith(1);
  });

  it("shows a generic not-found message rather than leaking existence info", async () => {
    render(<OrderTracking />);
    await submit("nonexistent");
    expect(
      await screen.findByText(/Order not found/i)
    ).toBeInTheDocument();
  });
});
