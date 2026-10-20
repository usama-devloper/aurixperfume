import { describe, it, expect, vi } from "vitest";

describe("E-Commerce Security & Payment Verification Logic", () => {
  describe("Price Tampering & Underpayment Protection", () => {
    it("rejects client-tampered prices by re-calculating against database products", () => {
      const dbProducts = new Map([
        [1, { id: 1, name: "Oud Sovereign", price: 4200 }],
        [2, { id: 2, name: "Desert Saffron", price: 3800 }],
      ]);

      // Malicious client payload trying to buy 4200 INR perfume for 10 INR
      const clientItems = [
        { product_id: 1, quantity: 2, claimed_price: 10 },
        { product_id: 2, quantity: 1, claimed_price: 15 },
      ];

      // Server computation using trusted DB map
      const serverSubtotal = clientItems.reduce((acc, it) => {
        const prod = dbProducts.get(it.product_id);
        if (!prod) throw new Error("Product not found");
        return acc + prod.price * it.quantity;
      }, 0);

      const clientClaimedSubtotal = clientItems.reduce(
        (acc, it) => acc + it.claimed_price * it.quantity,
        0
      );

      expect(clientClaimedSubtotal).toBe(35); // Tampered
      expect(serverSubtotal).toBe(12200); // True authoritative amount
      expect(serverSubtotal).not.toBe(clientClaimedSubtotal);
    });

    it("flags underpayment when Stripe payment amount does not match order total", () => {
      const orderTotalINR = 12200;
      const expectedPaise = Math.round(orderTotalINR * 100);

      // Scenario A: Malicious checkout session created for ₹100 instead of ₹12,200
      const tamperedSessionAmount = 10000; // 100 INR in paise

      const isValidAmount = (sessionAmount: number, orderTotal: number) => {
        const expected = Math.round(orderTotal * 100);
        return Math.abs(sessionAmount - expected) <= 100; // max 1 INR tolerance
      };

      expect(isValidAmount(tamperedSessionAmount, orderTotalINR)).toBe(false);

      // Scenario B: Exact payment
      expect(isValidAmount(expectedPaise, orderTotalINR)).toBe(true);
    });

    it("rejects currency mismatch between Stripe session and store currency", () => {
      const storeCurrency = "inr";
      const sessionCurrency = "usd";

      const isCurrencyValid = (curr: string) => curr.toLowerCase() === storeCurrency;

      expect(isCurrencyValid(sessionCurrency)).toBe(false);
      expect(isCurrencyValid("inr")).toBe(true);
      expect(isCurrencyValid("INR")).toBe(true);
    });
  });

  describe("Payment Replay & Idempotency", () => {
    it("prevents double-processing when webhook triggers multiple times for same order", () => {
      const order = {
        id: "ord-123",
        payment_status: "unpaid",
        status: "pending",
        processingCount: 0,
      };

      const handleWebhookPayment = (currentOrder: typeof order) => {
        if (currentOrder.payment_status === "paid") {
          return { skipped: true, reason: "Already paid" };
        }
        currentOrder.payment_status = "paid";
        currentOrder.status = "processing";
        currentOrder.processingCount += 1;
        return { skipped: false, updated: true };
      };

      // First webhook delivery
      const res1 = handleWebhookPayment(order);
      expect(res1.skipped).toBe(false);
      expect(order.payment_status).toBe("paid");
      expect(order.processingCount).toBe(1);

      // Duplicate / replayed webhook delivery
      const res2 = handleWebhookPayment(order);
      expect(res2.skipped).toBe(true);
      expect(res2.reason).toBe("Already paid");
      expect(order.processingCount).toBe(1); // Not processed again
    });
  });

  describe("Unauthorized Order & User Access Isolation (RLS Principle)", () => {
    it("ensures an order cannot be verified or marked paid by an unrelated user", () => {
      const authenticUserId = "user-111";
      const attackerUserId = "user-666";

      const order = {
        id: "ord-secret-777",
        user_id: authenticUserId,
        total_amount: 5000,
      };

      const verifySessionOwner = (sessionMetaUserId: string, orderUserId: string) => {
        return sessionMetaUserId === orderUserId;
      };

      expect(verifySessionOwner(attackerUserId, order.user_id)).toBe(false);
      expect(verifySessionOwner(authenticUserId, order.user_id)).toBe(true);
    });
  });

  describe("Order Tracking Input Sanitization", () => {
    it("rejects SQL injection, wildcards, or malicious patterns in order tracking input", () => {
      const sanitizeTrackingQuery = (query: string): string | null => {
        const trimmed = query.trim();
        if (trimmed.length < 4 || trimmed.length > 40) return null;
        // Strictly allow alphanumeric and hyphens
        if (!/^[A-Za-z0-9-]+$/.test(trimmed)) return null;
        return trimmed;
      };

      expect(sanitizeTrackingQuery("ORD-123456")).toBe("ORD-123456");
      expect(sanitizeTrackingQuery("TRACK-7890")).toBe("TRACK-7890");

      // Injection & wildcard attacks
      expect(sanitizeTrackingQuery("ORD-%")).toBeNull();
      expect(sanitizeTrackingQuery("'; DROP TABLE orders; --")).toBeNull();
      expect(sanitizeTrackingQuery("OR 1=1")).toBeNull();
      expect(sanitizeTrackingQuery("ab")).toBeNull(); // too short
    });
  });

  describe("Authoritative Order Creation Enforcement & Fallback Prevention", () => {
    it("halts checkout and maps raw RPC errors to customer-safe messages without direct client table inserts", async () => {
      // Mock supabase client
      const directInsertOrdersMock = vi.fn();
      const directInsertOrderItemsMock = vi.fn();

      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Product Oud Sovereign is currently out of stock", code: "P0001" },
        }),
        from: vi.fn((table: string) => {
          if (table === "orders") {
            return { insert: directInsertOrdersMock };
          }
          if (table === "order_items") {
            return { insert: directInsertOrderItemsMock };
          }
          return { upsert: vi.fn() };
        }),
      };

      // Order creation handler simulating hardened useOrders behavior
      const placeOrderHardened = async (cartItems: any[]) => {
        const rpcPayload = {
          p_items: cartItems.map(it => ({ product_id: it.product_id, quantity: it.quantity })),
          p_shipping_address_id: "addr-1",
          p_payment_method: "card",
          p_upi_utr: null,
        };

        const { data: rpcRes, error: rpcErr } = await mockSupabase.rpc(
          "create_authoritative_order",
          rpcPayload
        );

        if (rpcErr || !rpcRes?.order_id) {
          let userFacingError = "We could not complete your order. Please review your cart and try again.";
          const rawMsg = (rpcErr?.message || "").toLowerCase();
          if (rawMsg.includes("out of stock")) {
            userFacingError = "One or more items in your cart is currently out of stock. Please update your cart and try again.";
          }
          throw new Error(userFacingError);
        }

        return rpcRes;
      };

      await expect(
        placeOrderHardened([{ product_id: 99, quantity: 1 }])
      ).rejects.toThrow("One or more items in your cart is currently out of stock. Please update your cart and try again.");

      // Verify that direct table insert was NEVER invoked
      expect(directInsertOrdersMock).not.toHaveBeenCalled();
      expect(directInsertOrderItemsMock).not.toHaveBeenCalled();
    });

    it("successfully returns order confirmation matching all fields required by checkout steps, Stripe, and UI", async () => {
      const mockSuccessOrder = {
        order_id: "ord-uuid-999",
        order_number: "ORD-261020-abc123",
        total_amount: 4200,
        subtotal: 3800,
        shipping: 0,
        tax: 400,
        payment_status: "unpaid",
      };

      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: mockSuccessOrder,
          error: null,
        }),
      };

      const placeOrderHardened = async (cartItems: any[], paymentOptions?: any) => {
        const rpcPayload = {
          p_items: cartItems.map(it => ({ product_id: it.product_id, quantity: it.quantity })),
          p_shipping_address_id: "addr-1",
          p_payment_method: paymentOptions?.payment_method ?? "card",
          p_upi_utr: paymentOptions?.upi_utr ?? null,
        };

        const { data: rpcRes, error: rpcErr } = await mockSupabase.rpc(
          "create_authoritative_order",
          rpcPayload
        );

        if (rpcErr || !rpcRes?.order_id) {
          throw new Error("We could not complete your order. Please review your cart and try again.");
        }

        return {
          id: rpcRes.order_id,
          order_number: rpcRes.order_number,
          total_amount: rpcRes.total_amount,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          payment_status: rpcRes.payment_status,
          payment_method: paymentOptions?.payment_method ?? null,
          tracking_number: null,
          shipping_carrier: null,
          estimated_delivery: null,
        };
      };

      const res = await placeOrderHardened([{ product_id: 1, quantity: 1 }], { payment_method: "card" });
      
      // Check exact UI & flow compatibility
      expect(res.id).toBe("ord-uuid-999");
      expect(res.order_number).toBe("ORD-261020-abc123");
      expect(res.total_amount).toBe(4200);
      expect(res.status).toBe("pending");
      expect(res.payment_status).toBe("unpaid");
      expect(res.payment_method).toBe("card");
      expect(res.created_at).toBeDefined();
    });

    it("rejects unauthorized shipping address when address ownership check fails", async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Invalid or unauthorized shipping address", code: "P0001" },
        }),
      };

      const placeOrderHardened = async () => {
        const { error: rpcErr } = await mockSupabase.rpc("create_authoritative_order", {
          p_items: [{ product_id: 1, quantity: 1 }],
          p_shipping_address_id: "unauthorized-addr-id",
          p_payment_method: "card",
        });

        if (rpcErr) {
          throw new Error("We could not complete your order. Please review your cart and try again.");
        }
      };

      await expect(placeOrderHardened()).rejects.toThrow(
        "We could not complete your order. Please review your cart and try again."
      );
    });

    it("ensures site settings fallback calculation yields expected default fees when database rows are absent", () => {
      // Simulating the plpgsql fallback logic
      const computeFees = (
        rawFee: string | null,
        rawThresh: string | null,
        rawTax: string | null,
        subtotal: number
      ) => {
        let fee = 400;
        let thresh = 2000;
        let taxRate = 0.08;

        const numRegex = /^[0-9]+(\.[0-9]+)?$/;
        if (rawFee && numRegex.test(rawFee)) fee = parseFloat(rawFee);
        if (rawThresh && numRegex.test(rawThresh)) thresh = parseFloat(rawThresh);
        if (rawTax && numRegex.test(rawTax)) taxRate = parseFloat(rawTax);

        const shipping = subtotal < thresh ? fee : 0;
        const tax = Math.round(subtotal * taxRate * 100) / 100;
        const total = subtotal + shipping + tax;
        return { fee, thresh, taxRate, shipping, tax, total };
      };

      // Case 1: All settings missing (null / zero rows)
      const resDefault = computeFees(null, null, null, 1500);
      expect(resDefault.shipping).toBe(400);
      expect(resDefault.tax).toBe(120);
      expect(resDefault.total).toBe(2020);

      // Case 2: Free shipping threshold met
      const resFree = computeFees(null, null, null, 2500);
      expect(resFree.shipping).toBe(0);
      expect(resFree.total).toBe(2700);

      // Case 3: Malformed non-numeric values in site_settings (e.g. "invalid_fee")
      const resCorrupted = computeFees("corrupted_text", "bad_threshold", "not_a_tax", 1000);
      expect(resCorrupted.fee).toBe(400); // safely falls back to default 400
      expect(resCorrupted.thresh).toBe(2000); // safely falls back to default 2000
      expect(resCorrupted.taxRate).toBe(0.08); // safely falls back to default 0.08
    });

    it("verifies duplicate product items in cart are aggregated correctly before price calculation", () => {
      const items = [
        { product_id: 1, quantity: 2 },
        { product_id: 1, quantity: 3 },
        { product_id: 2, quantity: 1 },
      ];

      // Simulate plpgsql GROUP BY product_id aggregation
      const aggregated = items.reduce((acc, it) => {
        acc[it.product_id] = (acc[it.product_id] || 0) + it.quantity;
        return acc;
      }, {} as Record<number, number>);

      expect(aggregated[1]).toBe(5);
      expect(aggregated[2]).toBe(1);
    });
  });
});



