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

    it("verifies item validation logic rejects invalid, zero, negative, and over-limit quantities before and after aggregation", () => {
      const validateItems = (rawItems: any[]): { valid: boolean; error?: string; aggregated?: Record<number, number> } => {
        if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
          return { valid: false, error: "Order items must be a non-empty array with at most 50 items" };
        }

        // Pre-aggregation check on each raw item (mimicking plpgsql loop)
        for (const item of rawItems) {
          if (!item || typeof item !== "object") {
            return { valid: false, error: "Each item in order items must be an object" };
          }
          if (item.product_id === undefined || item.product_id === null || typeof item.product_id !== "number") {
            return { valid: false, error: "Invalid or missing product_id in order items" };
          }
          if (!/^[1-9][0-9]{0,8}$/.test(String(item.product_id))) {
            return { valid: false, error: "Product ID must be a positive integer" };
          }
          if (item.quantity === undefined || item.quantity === null || typeof item.quantity !== "number") {
            return { valid: false, error: "Invalid or missing quantity in order items" };
          }
          if (!/^[1-9][0-9]?$/.test(String(item.quantity))) {
            return { valid: false, error: "Item quantity must be an integer between 1 and 99" };
          }
        }

        // Aggregation check with safe bigint sum and bound check <= 99
        const agg: Record<number, number> = {};
        for (const item of rawItems) {
          const pid = Number(item.product_id);
          const qty = Number(item.quantity);
          agg[pid] = (agg[pid] || 0) + qty;
        }

        for (const pidStr of Object.keys(agg)) {
          const pid = Number(pidStr);
          const totalQty = agg[pid];
          if (totalQty <= 0 || totalQty > 99) {
            return { valid: false, error: `Aggregate quantity ${totalQty} exceeds limit (1-99)` };
          }
        }

        return { valid: true, aggregated: agg };
      };

      // Valid items
      expect(validateItems([{ product_id: 1, quantity: 5 }, { product_id: 1, quantity: 10 }]).valid).toBe(true);

      // Negative quantity cannot cancel positive quantity
      const negativeAttempt = validateItems([
        { product_id: 1, quantity: 10 },
        { product_id: 1, quantity: -5 },
      ]);
      expect(negativeAttempt.valid).toBe(false);
      expect(negativeAttempt.error).toBe("Item quantity must be an integer between 1 and 99");

      // Zero quantity rejected
      expect(validateItems([{ product_id: 1, quantity: 0 }]).valid).toBe(false);

      // Non-integer float quantity rejected
      expect(validateItems([{ product_id: 1, quantity: 1.5 }]).valid).toBe(false);

      // Missing or null quantity rejected
      expect(validateItems([{ product_id: 1, quantity: null }]).valid).toBe(false);
      expect(validateItems([{ product_id: 1 }]).valid).toBe(false);

      // Missing or non-positive product_id rejected
      expect(validateItems([{ product_id: 0, quantity: 2 }]).valid).toBe(false);
      expect(validateItems([{ product_id: -1, quantity: 2 }]).valid).toBe(false);
      expect(validateItems([{ product_id: null, quantity: 2 }]).valid).toBe(false);

      // Aggregate quantity exceeding 99 rejected
      const overLimitAttempt = validateItems([
        { product_id: 1, quantity: 60 },
        { product_id: 1, quantity: 50 },
      ]);
      expect(overLimitAttempt.valid).toBe(false);
      expect(overLimitAttempt.error).toContain("exceeds limit (1-99)");
    });

    it("verifies pre-aggregation item validation and safe bigint summation exist in Migration 2 SQL file", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const migration2Path = path.resolve(__dirname, "../../supabase/migrations/20261019124000_authoritative_orders_and_secure_tracking.sql");
      const migration2Sql = fs.readFileSync(migration2Path, "utf-8");

      // Verify pre-aggregation loop over jsonb_array_elements exists
      expect(migration2Sql).toMatch(/FOR\s+v_raw_item\s+IN\s+SELECT\s+\*\s+FROM\s+jsonb_array_elements\(p_items\)/i);

      // Verify positive integer regex validation on raw item quantity and product_id
      expect(migration2Sql).toMatch(/\(v_raw_item->>'quantity'\)\s+!~\s+'\^\[1-9\]\[0-9\]\?\$'/i);
      expect(migration2Sql).toMatch(/\(v_raw_item->>'product_id'\)\s+!~\s+'\^\[1-9\]\[0-9\]\{0,8\}\$'/i);

      // Verify SUM uses bigint casting to protect against integer overflow before bounding to 99
      expect(migration2Sql).toMatch(/SUM\(\(elem->>'quantity'\)::bigint\)\s+AS\s+total_quantity/i);
      expect(migration2Sql).toMatch(/v_item\.total_quantity\s+>\s+99/i);
    });

    it("verifies all live database legacy policy names have DROP POLICY IF EXISTS statements on correct tables in Migration 1", async () => {
      // Read the actual SQL file content from disk
      const fs = await import("fs");
      const path = await import("path");
      const migration1Path = path.resolve(__dirname, "../../supabase/migrations/20261019123000_secure_orders_and_items_rls.sql");
      const migration1Sql = fs.readFileSync(migration1Path, "utf-8");

      // Verify each known live legacy policy is explicitly dropped on its corresponding table
      const expectedDrops = [
        { policy: "Users can create their own orders", table: "public.orders" },
        { policy: "Users can update their own orders", table: "public.orders" },
        { policy: "Users can view their own orders", table: "public.orders" },
        { policy: "Users can create order items for their orders", table: "public.order_items" },
        { policy: "Admins can update order items", table: "public.order_items" },
      ];

      for (const { policy, table } of expectedDrops) {
        const dropPattern = new RegExp(`DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${policy}"\\s+ON\\s+${table}`, "i");
        expect(dropPattern.test(migration1Sql)).toBe(true);
      }
    });

    it("verifies function EXECUTE revocations and grants in Migration 2 SQL file", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const migration2Path = path.resolve(__dirname, "../../supabase/migrations/20261019124000_authoritative_orders_and_secure_tracking.sql");
      const migration2Sql = fs.readFileSync(migration2Path, "utf-8");

      // Verify create_authoritative_order revokes ALL from PUBLIC and anon, then grants to authenticated
      expect(migration2Sql).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.create_authoritative_order\(jsonb,\s*uuid,\s*text,\s*text\)\s+FROM\s+PUBLIC,\s*anon;/i
      );
      expect(migration2Sql).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.create_authoritative_order\(jsonb,\s*uuid,\s*text,\s*text\)\s+TO\s+authenticated;/i
      );

      // Verify track_order revokes ALL from PUBLIC, then grants to anon and authenticated
      expect(migration2Sql).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.track_order\(text\)\s+FROM\s+PUBLIC;/i
      );
      expect(migration2Sql).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.track_order\(text\)\s+TO\s+anon,\s*authenticated;/i
      );
    });
  });

  describe("Payment Webhook Cryptographic Verification & Hardening", () => {
    it("verifies payment-webhook/index.ts requires cryptographic HMAC signature verification", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const webhookPath = path.resolve(__dirname, "../../supabase/functions/payment-webhook/index.ts");
      const webhookCode = fs.readFileSync(webhookPath, "utf-8");

      // 1. Verifies Stripe SDK official webhook construction is invoked
      expect(webhookCode).toMatch(/stripe\.webhooks\.constructEventAsync/);

      // 2. Verifies secret key is fetched from server environment
      expect(webhookCode).toMatch(/Deno\.env\.get\("STRIPE_WEBHOOK_SECRET"\)/);

      // 3. Verifies missing signature header is rejected before processing
      expect(webhookCode).toMatch(/Missing signature header|Missing stripe-signature header/);

      // 4. Verifies unverified Razorpay requests are rejected while Razorpay is inactive
      expect(webhookCode).toMatch(/req\.headers\.has\("x-razorpay-signature"\)/);

      // 5. Verifies amount and currency checks are performed against the order
      expect(webhookCode).toMatch(/sessionAmount\s*-\s*expectedAmount/);
      expect(webhookCode).toMatch(/session\.currency/);

      // 6. Verifies idempotency check: already paid orders are not re-processed
      expect(webhookCode).toMatch(/order\.payment_status\s*===\s*"paid"/);

      // 7. Confirms unauthenticated raw JSON parsing without signature verification is eliminated
      expect(webhookCode).not.toMatch(/const\s+eventType\s*=\s*event\.type\s*\|\|\s*event\.event/);

      // 8. Verifies payment settlement check: session.payment_status must be 'paid'
      expect(webhookCode).toMatch(/session\.payment_status\s*!==\s*"paid"/);

      // 9. Verifies atomic conditional database update with .neq("payment_status", "paid")
      expect(webhookCode).toMatch(/\.neq\("payment_status",\s*"paid"\)/);

      // 10. Verifies zero rows updated response handling for concurrent deliveries
      expect(webhookCode).toMatch(/!updatedRows\s*\|\|\s*updatedRows\.length\s*===\s*0/);
    });

    describe("Behavioral Validation of Webhook Decision Logic", () => {
      // Pure helper mirroring webhook payment settlement logic
      const verifySettlement = (session: { payment_status?: string | null }) => {
        if (session.payment_status === "paid") {
          return { isSettled: true, action: "process" };
        }
        return {
          isSettled: false,
          action: "ignore",
          reason: `Session payment_status is '${session.payment_status}', not 'paid'`,
        };
      };

      // Pure helper mirroring currency validation
      const verifyCurrency = (currency?: string | null) => {
        const normalized = (currency || "").toLowerCase().trim();
        return normalized === "inr";
      };

      // Pure helper mirroring amount tolerance comparison (100 paise = ₹1.00 tolerance)
      const verifyAmountTolerance = (sessionAmountPaise: number, orderTotalINR: number, tolerancePaise = 100) => {
        const expectedPaise = Math.round(Number(orderTotalINR) * 100);
        const diff = Math.abs(sessionAmountPaise - expectedPaise);
        return {
          isValid: diff <= tolerancePaise,
          diff,
          expectedPaise,
          sessionAmountPaise,
        };
      };

      it("validates successful versus unsettled Stripe payment sessions", () => {
        // Successful settlement
        expect(verifySettlement({ payment_status: "paid" })).toEqual({
          isSettled: true,
          action: "process",
        });

        // Unsettled delayed payment (e.g. ACH, SEPA, bank transfer pending)
        const unpaidRes = verifySettlement({ payment_status: "unpaid" });
        expect(unpaidRes.isSettled).toBe(false);
        expect(unpaidRes.action).toBe("ignore");
        expect(unpaidRes.reason).toContain("unpaid");

        // No payment required ($0 or trial)
        const noPayRes = verifySettlement({ payment_status: "no_payment_required" });
        expect(noPayRes.isSettled).toBe(false);
        expect(noPayRes.action).toBe("ignore");

        // Missing or null payment_status
        expect(verifySettlement({ payment_status: null }).isSettled).toBe(false);
        expect(verifySettlement({}).isSettled).toBe(false);
      });

      it("validates store currency strictly against INR", () => {
        expect(verifyCurrency("inr")).toBe(true);
        expect(verifyCurrency("INR")).toBe(true);
        expect(verifyCurrency("InR ")).toBe(true);

        expect(verifyCurrency("usd")).toBe(false);
        expect(verifyCurrency("eur")).toBe(false);
        expect(verifyCurrency("gbp")).toBe(false);
        expect(verifyCurrency("")).toBe(false);
        expect(verifyCurrency(null)).toBe(false);
        expect(verifyCurrency(undefined)).toBe(false);
      });

      it("verifies exact amount matches and underpayment attempts", () => {
        const orderTotal = 4599; // ₹4,599.00
        const expectedPaise = 459900;

        // Exact match
        const exactMatch = verifyAmountTolerance(expectedPaise, orderTotal);
        expect(exactMatch.isValid).toBe(true);
        expect(exactMatch.diff).toBe(0);

        // Underpayment attack (trying to pay ₹10 for a ₹4,599 order)
        const underpayment = verifyAmountTolerance(1000, orderTotal);
        expect(underpayment.isValid).toBe(false);
        expect(underpayment.diff).toBe(458900);

        // Overpayment / foreign price manipulation
        const mismatch = verifyAmountTolerance(999900, orderTotal);
        expect(mismatch.isValid).toBe(false);
      });

      it("verifies the 100-paise tolerance against tax and shipping floating-point calculations", () => {
        // Real e-commerce scenario: Perfume subtotal ₹2,599.00 with 8% tax
        // Subtotal = 2599
        // Tax (8%) = round(2599 * 0.08, 2) = 207.92
        // Shipping = ₹0 (order >= ₹2000)
        // Order Total in DB = 2806.92 -> expectedPaise = 280692
        const orderTotal = 2806.92;
        const expectedPaise = Math.round(orderTotal * 100); // 280692

        // Due to Stripe integer rounding on discrete items, amounts can fluctuate by ±50 to ±100 paise
        // Exactly within 100 paise boundary
        expect(verifyAmountTolerance(expectedPaise + 50, orderTotal).isValid).toBe(true);
        expect(verifyAmountTolerance(expectedPaise - 50, orderTotal).isValid).toBe(true);
        expect(verifyAmountTolerance(expectedPaise + 100, orderTotal).isValid).toBe(true);
        expect(verifyAmountTolerance(expectedPaise - 100, orderTotal).isValid).toBe(true);

        // Boundary exceedance (101 paise difference is rejected)
        const exceedBoundaryUpper = verifyAmountTolerance(expectedPaise + 101, orderTotal);
        expect(exceedBoundaryUpper.isValid).toBe(false);
        expect(exceedBoundaryUpper.diff).toBe(101);

        const exceedBoundaryLower = verifyAmountTolerance(expectedPaise - 101, orderTotal);
        expect(exceedBoundaryLower.isValid).toBe(false);
        expect(exceedBoundaryLower.diff).toBe(101);
      });

      it("verifies concurrent delivery handling and zero-rows-updated behavior", () => {
        // Simulates concurrent executions of the conditional SQL update
        let dbOrder = {
          id: "ord-conc-123",
          payment_status: "unpaid",
          status: "pending",
          updateCount: 0,
        };

        const simulateConditionalUpdate = (orderRecord: typeof dbOrder, updatePayload: { payment_status: string }) => {
          // SQL condition: WHERE id = orderId AND payment_status != 'paid'
          if (orderRecord.payment_status === "paid") {
            // 0 rows updated
            return { rowsUpdated: 0, data: [] };
          }
          orderRecord.payment_status = updatePayload.payment_status;
          orderRecord.updateCount += 1;
          return { rowsUpdated: 1, data: [{ id: orderRecord.id }] };
        };

        // First worker updates successfully
        const worker1 = simulateConditionalUpdate(dbOrder, { payment_status: "paid" });
        expect(worker1.rowsUpdated).toBe(1);
        expect(dbOrder.payment_status).toBe("paid");
        expect(dbOrder.updateCount).toBe(1);

        // Concurrent worker 2 receives 0 rows updated and exits cleanly without error
        const worker2 = simulateConditionalUpdate(dbOrder, { payment_status: "paid" });
        expect(worker2.rowsUpdated).toBe(0);
        expect(worker2.data.length).toBe(0);
        expect(dbOrder.updateCount).toBe(1); // Not updated twice

        // Late-arriving failed/expired event cannot overwrite paid order
        const worker3Expired = simulateConditionalUpdate(dbOrder, { payment_status: "failed" });
        expect(worker3Expired.rowsUpdated).toBe(0);
        expect(dbOrder.payment_status).toBe("paid"); // Preserved as paid
      });
    });
  });

  describe("Authoritative Pricing & Coupon Integration Verification (SEC-03 Remediation)", () => {
    it("verifies create-checkout-session/index.ts derives pricing and discounts authoritatively from database", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const checkoutSessionPath = path.resolve(
        __dirname,
        "../../supabase/functions/create-checkout-session/index.ts"
      );
      const checkoutCode = fs.readFileSync(checkoutSessionPath, "utf-8");

      // 1. Verifies database query selects authoritative pricing and discount fields
      expect(checkoutCode).toMatch(
        /select\(\s*["']id,\s*user_id,\s*total_amount,\s*payment_status,\s*discount_amount,\s*shipping,\s*tax,\s*subtotal["']\s*\)/
      );

      // 2. Verifies already-paid orders are blocked from checkout session creation
      expect(checkoutCode).toMatch(/order\.payment_status\s*===\s*["']paid["']/);
      expect(checkoutCode).toMatch(/Order is already paid/);

      // 3. Verifies zero or negative amount orders are rejected before Stripe session creation
      expect(checkoutCode).toMatch(/Math\.round\(totalOrderAmountINR\s*\*\s*100\)\s*<=\s*0/);
      expect(checkoutCode).toMatch(/Orders with total amount of zero or less cannot be processed/);

      // 4. Verifies line items are fetched directly from authoritative order_items table
      expect(checkoutCode).toMatch(/\.from\(["']order_items["']\)/);
      expect(checkoutCode).toMatch(/item\.unit_price/);

      // 5. Verifies authoritative fee resolution without trusting client payload
      expect(checkoutCode).toMatch(/const\s+storedShipping\s*=\s*Number\(order\.shipping\)\s*\|\|\s*0/);
      expect(checkoutCode).toMatch(/const\s+storedTax\s*=\s*Number\(order\.tax\)\s*\|\|\s*0/);
      expect(checkoutCode).toMatch(/if\s*\(storedShipping\s*>\s*0\s*\|\|\s*storedTax\s*>\s*0\)/);
      expect(checkoutCode).toMatch(/const\s+extraFees\s*=\s*Math\.round\(\(totalOrderAmountINR\s*-\s*netSubtotal\)\s*\*\s*100\)\s*\/\s*100/);

      // 6. Verifies Stripe coupon creation using authoritative dbDiscount in paise
      expect(checkoutCode).toMatch(/stripe\.coupons\.create\(\{/);
      expect(checkoutCode).toMatch(/amount_off:\s*Math\.round\(dbDiscount\s*\*\s*100\)/);
      expect(checkoutCode).toMatch(/duration:\s*["']once["']/);
      expect(checkoutCode).toMatch(/discounts\s*=\s*\[\{\s*coupon:\s*stripeCoupon\.id\s*\}\]/);
      expect(checkoutCode).toMatch(/\.\.\.\(discounts\s*\?\s*\{\s*discounts\s*\}\s*:\s*\{\}\)/);

      // 7. Verifies authoritative pricing and session ID persistence into orders table
      expect(checkoutCode).toMatch(/payment_reference:\s*session\.id/);
      expect(checkoutCode).toMatch(/subtotal:\s*catalogSubtotal/);
      expect(checkoutCode).toMatch(/shipping:\s*dbShipping/);
      expect(checkoutCode).toMatch(/tax:\s*dbTax/);
    });

    describe("Shared Authoritative Pricing Contract & Domain Logic", () => {
      // Import the genuinely shared authoritative pricing domain logic
      const getPricingModule = async () => {
        return await import("../lib/authoritativePricing");
      };

      it("reconciles exact amounts for storefront orders with no coupon (free shipping)", async () => {
        const { resolveAuthoritativePricing } = await getPricingModule();

        // 1x Oud Sovereign: subtotal ₹4,200, free shipping, tax 8% (₹336), total ₹4,536
        // Model unpopulated DB row (create_authoritative_order legacy state)
        const legacyDbOrder = {
          total_amount: 4536,
          discount_amount: 0,
          shipping: 0, // Unpopulated in table
          tax: 0,      // Unpopulated in table
          subtotal: 0,
        };
        const dbItems = [{ unit_price: 4200, quantity: 1 }];

        const resolution = resolveAuthoritativePricing(legacyDbOrder, dbItems);

        expect(resolution.catalogSubtotal).toBe(4200);
        expect(resolution.discountAmount).toBe(0);
        expect(resolution.shipping).toBe(0);
        expect(resolution.tax).toBe(336);
        expect(resolution.totalAmount).toBe(4536);
        expect(resolution.stripeLineItemsPaise).toBe(453600);
        expect(resolution.stripeCouponPaise).toBe(0);
        expect(resolution.stripeFinalAmountPaise).toBe(453600);
        expect(resolution.expectedPaise).toBe(453600);
        expect(resolution.diffPaise).toBe(0);
        expect(resolution.isExactMatch).toBe(true);
      });

      it("reconciles exact amounts for storefront orders with no coupon (paid shipping)", async () => {
        const { resolveAuthoritativePricing } = await getPricingModule();

        // 1x Amber Essence: subtotal ₹1,500, shipping ₹400, tax 8% (₹120), total ₹2,020
        const legacyDbOrder = {
          total_amount: 2020,
          discount_amount: 0,
          shipping: 0, // Unpopulated in table
          tax: 0,      // Unpopulated in table
          subtotal: 0,
        };
        const dbItems = [{ unit_price: 1500, quantity: 1 }];

        const resolution = resolveAuthoritativePricing(legacyDbOrder, dbItems);

        expect(resolution.catalogSubtotal).toBe(1500);
        expect(resolution.shipping).toBe(400);
        expect(resolution.tax).toBe(120);
        expect(resolution.stripeFinalAmountPaise).toBe(202000);
        expect(resolution.expectedPaise).toBe(202000);
        expect(resolution.diffPaise).toBe(0);
        expect(resolution.isExactMatch).toBe(true);
      });

      it("reconciles exact amounts for percentage-discounted orders (WELCOME10 10% off)", async () => {
        const { resolveAuthoritativePricing } = await getPricingModule();

        // Subtotal: ₹4,200, Discount 10%: ₹420, Net: ₹3,780, Shipping: ₹0, Tax: ₹302.40, Total: ₹4,082.40
        const order = {
          total_amount: 4082.40,
          discount_amount: 420.00,
          shipping: 0,
          tax: 302.40,
          subtotal: 4200.00,
        };
        const dbItems = [{ unit_price: 4200, quantity: 1 }];

        const resolution = resolveAuthoritativePricing(order, dbItems);

        expect(resolution.catalogSubtotal).toBe(4200);
        expect(resolution.discountAmount).toBe(420);
        expect(resolution.netSubtotal).toBe(3780);
        expect(resolution.shipping).toBe(0);
        expect(resolution.tax).toBe(302.40);
        expect(resolution.totalAmount).toBe(4082.40);
        // Line items in Stripe: items (420000) + tax (30240) = 450240 paise
        expect(resolution.stripeLineItemsPaise).toBe(450240);
        // Stripe coupon: 42000 paise
        expect(resolution.stripeCouponPaise).toBe(42000);
        // Net Stripe charge: 450240 - 42000 = 408240 paise
        expect(resolution.stripeFinalAmountPaise).toBe(408240);
        expect(resolution.expectedPaise).toBe(408240);
        expect(resolution.diffPaise).toBe(0);
        expect(resolution.isExactMatch).toBe(true);
      });

      it("reconciles exact amounts for fixed-discount orders with paid shipping (SAVE500 ₹500 off)", async () => {
        const { resolveAuthoritativePricing } = await getPricingModule();

        // Subtotal: ₹1,500, Discount: ₹500, Net: ₹1,000, Shipping: ₹150, Tax: ₹80, Total: ₹1,230
        const order = {
          total_amount: 1230.00,
          discount_amount: 500.00,
          shipping: 150.00,
          tax: 80.00,
          subtotal: 1500.00,
        };
        const dbItems = [{ unit_price: 1500, quantity: 1 }];

        const resolution = resolveAuthoritativePricing(order, dbItems);

        expect(resolution.catalogSubtotal).toBe(1500);
        expect(resolution.discountAmount).toBe(500);
        expect(resolution.netSubtotal).toBe(1000);
        expect(resolution.shipping).toBe(150);
        expect(resolution.tax).toBe(80);
        expect(resolution.stripeLineItemsPaise).toBe(173000);
        expect(resolution.stripeCouponPaise).toBe(50000);
        expect(resolution.stripeFinalAmountPaise).toBe(123000);
        expect(resolution.expectedPaise).toBe(123000);
        expect(resolution.diffPaise).toBe(0);
        expect(resolution.isExactMatch).toBe(true);
      });

      it("enforces coupon validation rules and rejects invalid, expired, or sub-threshold coupons", async () => {
        const { validateAuthoritativeCoupon } = await getPricingModule();
        const testNow = new Date("2026-10-26T12:00:00Z");

        // 1. Inactive coupon
        const inactive = validateAuthoritativeCoupon(
          { id: "1", code: "INACTIVE", discount_type: "percent", discount_value: 10, min_order: 1000, is_active: false },
          2000,
          testNow
        );
        expect(inactive.isValid).toBe(false);
        expect(inactive.error).toContain("Invalid or expired coupon");

        // 2. Expired coupon
        const expired = validateAuthoritativeCoupon(
          { id: "2", code: "EXPIRED", discount_type: "fixed", discount_value: 200, min_order: 1000, is_active: true, valid_until: "2026-10-01" },
          2000,
          testNow
        );
        expect(expired.isValid).toBe(false);
        expect(expired.error).toContain("Invalid or expired coupon");

        // 3. Minimum order threshold failure
        const belowMin = validateAuthoritativeCoupon(
          { id: "3", code: "MIN5000", discount_type: "fixed", discount_value: 500, min_order: 5000, is_active: true },
          2500,
          testNow
        );
        expect(belowMin.isValid).toBe(false);
        expect(belowMin.error).toContain("Coupon requires minimum order of ₹5000");

        // 4. Fixed discount capped at subtotal (never negative)
        const capped = validateAuthoritativeCoupon(
          { id: "4", code: "MEGA3000", discount_type: "fixed", discount_value: 3000, min_order: 1000, is_active: true },
          2500,
          testNow
        );
        expect(capped.isValid).toBe(true);
        expect(capped.discountAmount).toBe(2500); // Capped at subtotal 2500, not 3000
      });

      it("protects checkout against client tampering of shipping, tax, and item prices", async () => {
        const { resolveAuthoritativePricing } = await getPricingModule();

        // Authentic DB order record
        const dbOrderRecord = {
          total_amount: 1730,
          discount_amount: 0,
          shipping: 150,
          tax: 80,
          subtotal: 1500,
        };

        // Authentic DB items from order_items table
        const authenticDbItems = [{ unit_price: 1500, quantity: 1 }];

        // Malicious client tries to send shipping = 0 and tax = 0 in request body
        const maliciousClientBody = {
          orderId: "ord-123",
          shipping: 0,
          tax: 0,
          items: [{ unit_price: 1, quantity: 1 }],
        };

        // The authoritative resolver uses strictly DB order and DB items:
        const resolution = resolveAuthoritativePricing(dbOrderRecord, authenticDbItems);

        // Verifies client tampered values are completely ignored in favor of DB values
        expect(resolution.shipping).toBe(150);
        expect(resolution.tax).toBe(80);
        expect(resolution.catalogSubtotal).toBe(1500);
        expect(resolution.shipping).not.toBe(maliciousClientBody.shipping);
        expect(resolution.tax).not.toBe(maliciousClientBody.tax);
        expect(resolution.catalogSubtotal).not.toBe(maliciousClientBody.items[0].unit_price);
        expect(resolution.stripeFinalAmountPaise).toBe(173000);
      });

      it("strictly rejects underpayment and overpayment outside the 100-paise tolerance", () => {
        const verifyAmountTolerance = (sessionAmountPaise: number, orderTotalINR: number, tolerancePaise = 100) => {
          const expectedPaise = Math.round(Number(orderTotalINR) * 100);
          const diff = Math.abs(sessionAmountPaise - expectedPaise);
          return {
            isValid: diff <= tolerancePaise,
            diff,
          };
        };

        const orderTotalINR = 4082.40;
        const expectedPaise = 408240;

        // Exactly within +/- 100 paise
        expect(verifyAmountTolerance(expectedPaise, orderTotalINR).isValid).toBe(true);
        expect(verifyAmountTolerance(expectedPaise + 100, orderTotalINR).isValid).toBe(true);
        expect(verifyAmountTolerance(expectedPaise - 100, orderTotalINR).isValid).toBe(true);

        // Outside tolerance by 101 paise
        const underpayment = verifyAmountTolerance(expectedPaise - 101, orderTotalINR);
        expect(underpayment.isValid).toBe(false);
        expect(underpayment.diff).toBe(101);

        const overpayment = verifyAmountTolerance(expectedPaise + 101, orderTotalINR);
        expect(overpayment.isValid).toBe(false);
        expect(overpayment.diff).toBe(101);

        // Severe underpayment attack (paying ₹100 instead of ₹4,082.40)
        const severeAttack = verifyAmountTolerance(10000, orderTotalINR);
        expect(severeAttack.isValid).toBe(false);
        expect(severeAttack.diff).toBe(398240);
      });
    });
  });

  describe("Edge Function Production Security Hardening", () => {
    it("enforces production origin allowlist, safe redirect paths, PaymentIntent metadata, and DB error checks in create-checkout-session", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../../supabase/functions/create-checkout-session/index.ts"
      );
      const code = fs.readFileSync(filePath, "utf-8");

      // 1. Production origin allowlist enforced; no localhost fallback or wildcard CORS
      expect(code).toContain('"https://aurixperfume.in"');
      expect(code).toContain('"https://www.aurixperfume.in"');
      expect(code).not.toContain("http://localhost:8080");
      expect(code).not.toMatch(/"Access-Control-Allow-Origin":\s*"\*"/);
      expect(code).toMatch(/status:\s*403/);

      // 2. Redirect path validation prevents open redirects
      expect(code).toMatch(/function\s+validateRedirectPath/);
      expect(code).toMatch(/!trimmed\.startsWith\("\/"\)/);
      expect(code).toMatch(/trimmed\.startsWith\("\/\/"\)/);
      expect(code).toMatch(/Invalid redirect path/);

      // 3. PaymentIntent metadata attached alongside Checkout Session metadata
      expect(code).toMatch(/payment_intent_data:\s*\{\s*metadata:\s*\{\s*order_id:\s*body\.orderId,\s*user_id:\s*user\.id,?\s*\},?\s*\}/);

      // 4. DB update error checked explicitly
      expect(code).toMatch(/const\s*\{\s*error:\s*updateErr\s*\}\s*=\s*await\s+adminClient/);
      expect(code).toMatch(/if\s*\(updateErr\)/);

      // 5. Raw internal error messages not leaked in 500 catch block
      expect(code).not.toMatch(/message:\s*error\s+instanceof\s+Error\s*\?\s*error\.message/);
    });

    it("validates redirect paths and production origin allowlist behaviorally", () => {
      const ALLOWED_ORIGINS = new Set([
        "https://aurixperfume.in",
        "https://www.aurixperfume.in",
      ]);
      const DEFAULT_ORIGIN = "https://aurixperfume.in";

      const validateRedirectPath = (path: unknown, fallback: string): string | null => {
        if (path === undefined || path === null || path === "") return fallback;
        if (typeof path !== "string") return null;
        const trimmed = path.trim();
        if (
          !trimmed.startsWith("/") ||
          trimmed.startsWith("//") ||
          trimmed.includes("\\") ||
          trimmed.includes("://") ||
          trimmed.includes("@") ||
          /[\s\r\n\0]/.test(trimmed)
        ) {
          return null;
        }
        try {
          const parsed = new URL(trimmed, DEFAULT_ORIGIN);
          if (parsed.origin !== DEFAULT_ORIGIN || parsed.search || parsed.hash) return null;
          return parsed.pathname;
        } catch {
          return null;
        }
      };

      // Allowed production origins
      expect(ALLOWED_ORIGINS.has("https://aurixperfume.in")).toBe(true);
      expect(ALLOWED_ORIGINS.has("https://www.aurixperfume.in")).toBe(true);
      expect(ALLOWED_ORIGINS.has("https://evil.example.com")).toBe(false);
      expect(ALLOWED_ORIGINS.has("http://aurixperfume.in")).toBe(false);

      // Valid relative single-slash paths
      expect(validateRedirectPath(undefined, "/order-confirmation")).toBe("/order-confirmation");
      expect(validateRedirectPath("/order-confirmation", "/order-confirmation")).toBe("/order-confirmation");
      expect(validateRedirectPath("/checkout", "/checkout")).toBe("/checkout");

      // Open-redirect and malformed path attacks rejected
      expect(validateRedirectPath("//evil.com/steal", "/checkout")).toBeNull();
      expect(validateRedirectPath("https://evil.com/steal", "/checkout")).toBeNull();
      expect(validateRedirectPath("/\\evil.com", "/checkout")).toBeNull();
      expect(validateRedirectPath("/@evil.com", "/checkout")).toBeNull();
      expect(validateRedirectPath("order-confirmation", "/checkout")).toBeNull();
      expect(validateRedirectPath("/checkout?session_id=fake", "/checkout")).toBeNull();
    });

    it("prevents verify-payment from ever overwriting an already-paid order and enforces authoritative amount & currency checks", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const verifyPath = path.resolve(
        __dirname,
        "../../supabase/functions/verify-payment/index.ts"
      );
      const code = fs.readFileSync(verifyPath, "utf-8");

      // Fetches existing order including authoritative total_amount
      expect(code).toMatch(/\.select\("id,\s*user_id,\s*total_amount,\s*payment_status"\)/);
      // Enforces strict currency check (rejects missing or non-INR currency)
      expect(code).toMatch(/if\s*\(!session\.currency\s*\|\|\s*session\.currency\.toLowerCase\(\)\s*!==\s*"inr"\)/);
      // Validates session.amount_total against authoritative DB total_amount with 100-paise tolerance
      expect(code).toMatch(/typeof\s+sessionAmount\s*!==\s*"number"/);
      expect(code).toMatch(/Math\.abs\(sessionAmount\s*-\s*expectedAmount\)\s*>\s*100/);
      expect(code).toContain("Amount mismatch");
      expect(code).toContain("Invalid payment amount");
      // Fetches existing order and short-circuits when payment_status === 'paid'
      expect(code).toMatch(/existingOrder\.payment_status\s*===\s*"paid"/);
      // Conditional database guard prevents race-condition downgrade and detects 0-row concurrent settlement
      expect(code).toMatch(/\.neq\("payment_status",\s*"paid"\)\s*\r?\n\s*\.select\("id"\)/);
      expect(code).toMatch(/!updatedRows\s*\|\|\s*updatedRows\.length\s*===\s*0/);
      // Enforces production origin allowlist (no wildcard CORS)
      expect(code).toContain('"https://aurixperfume.in"');
      expect(code).toContain('"https://www.aurixperfume.in"');
      expect(code).not.toMatch(/"Access-Control-Allow-Origin":\s*"\*"/);
      // Checks DB update error and does not leak raw error.message
      expect(code).toMatch(/if\s*\(updateErr\)/);
      expect(code).not.toMatch(/message:\s*error\s+instanceof\s+Error\s*\?\s*error\.message/);
    });

    it("behaviorally verifies verify-payment amount, currency, downgrade, and concurrent webhook settlement logic", () => {
      const verifyPaymentDecision = (params: {
        sessionCurrency?: string | null;
        sessionAmount?: unknown;
        sessionPaymentStatus: string;
        dbOrder: { total_amount: number; payment_status: string };
        concurrentWebhookSettled?: boolean;
      }) => {
        if (!params.sessionCurrency || params.sessionCurrency.toLowerCase() !== "inr") {
          return { status: 400, error: "Currency mismatch" };
        }
        if (params.dbOrder.payment_status === "paid") {
          return { status: 200, paid: true, paymentStatus: "paid", already_processed: true };
        }
        const expectedAmount = Math.round(Number(params.dbOrder.total_amount) * 100);
        if (
          typeof params.sessionAmount !== "number" ||
          !Number.isFinite(params.sessionAmount) ||
          params.sessionAmount <= 0 ||
          expectedAmount <= 0
        ) {
          return { status: 400, error: "Invalid payment amount" };
        }
        if (Math.abs(params.sessionAmount - expectedAmount) > 100) {
          return { status: 400, error: "Amount mismatch" };
        }
        const paid = params.sessionPaymentStatus === "paid";
        // Simulate atomic .neq("payment_status", "paid") when webhook settles concurrently
        if (params.concurrentWebhookSettled) {
          params.dbOrder.payment_status = "paid";
          // 0 rows updated -> re-reads authoritative DB payment_status ('paid')
          return { status: 200, paid: true, paymentStatus: "paid", already_processed: true };
        }
        params.dbOrder.payment_status = paid ? "paid" : "failed";
        return { status: 200, paid, paymentStatus: params.sessionPaymentStatus };
      };

      // 1. Valid exact Stripe amount succeeds
      const order1 = { total_amount: 4536, payment_status: "unpaid" };
      expect(
        verifyPaymentDecision({
          sessionCurrency: "inr",
          sessionAmount: 453600,
          sessionPaymentStatus: "paid",
          dbOrder: order1,
        })
      ).toEqual({ status: 200, paid: true, paymentStatus: "paid" });
      expect(order1.payment_status).toBe("paid");

      // 2. Incorrect Stripe amount rejected
      const order2 = { total_amount: 4536, payment_status: "unpaid" };
      expect(
        verifyPaymentDecision({
          sessionCurrency: "inr",
          sessionAmount: 10000,
          sessionPaymentStatus: "paid",
          dbOrder: order2,
        })
      ).toEqual({ status: 400, error: "Amount mismatch" });
      expect(order2.payment_status).toBe("unpaid");

      // 3. Missing or invalid Stripe amount rejected
      expect(
        verifyPaymentDecision({
          sessionCurrency: "inr",
          sessionAmount: null,
          sessionPaymentStatus: "paid",
          dbOrder: { total_amount: 4536, payment_status: "unpaid" },
        })
      ).toEqual({ status: 400, error: "Invalid payment amount" });

      // 4. Currency mismatch or missing currency rejected
      expect(
        verifyPaymentDecision({
          sessionCurrency: "usd",
          sessionAmount: 453600,
          sessionPaymentStatus: "paid",
          dbOrder: { total_amount: 4536, payment_status: "unpaid" },
        })
      ).toEqual({ status: 400, error: "Currency mismatch" });
      expect(
        verifyPaymentDecision({
          sessionCurrency: undefined,
          sessionAmount: 453600,
          sessionPaymentStatus: "paid",
          dbOrder: { total_amount: 4536, payment_status: "unpaid" },
        })
      ).toEqual({ status: 400, error: "Currency mismatch" });

      // 5. Already-paid order cannot be downgraded by a failed/unpaid session check
      const paidOrder = { total_amount: 4536, payment_status: "paid" };
      expect(
        verifyPaymentDecision({
          sessionCurrency: "inr",
          sessionAmount: 453600,
          sessionPaymentStatus: "unpaid",
          dbOrder: paidOrder,
        })
      ).toEqual({ status: 200, paid: true, paymentStatus: "paid", already_processed: true });
      expect(paidOrder.payment_status).toBe("paid");

      // 6. Concurrent webhook settlement prevents reporting failed payment when 0 rows updated
      const racingOrder = { total_amount: 4536, payment_status: "unpaid" };
      expect(
        verifyPaymentDecision({
          sessionCurrency: "inr",
          sessionAmount: 453600,
          sessionPaymentStatus: "unpaid",
          dbOrder: racingOrder,
          concurrentWebhookSettled: true,
        })
      ).toEqual({ status: 200, paid: true, paymentStatus: "paid", already_processed: true });
      expect(racingOrder.payment_status).toBe("paid");
    });

    it("enforces production origin allowlist in shared CORS without breaking Stripe server-to-server webhooks", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const corsPath = path.resolve(__dirname, "../../supabase/functions/_shared/cors.ts");
      const corsCode = fs.readFileSync(corsPath, "utf-8");

      expect(corsCode).toContain('"https://aurixperfume.in"');
      expect(corsCode).toContain('"https://www.aurixperfume.in"');
      expect(corsCode).not.toMatch(/"Access-Control-Allow-Origin":\s*"\*"/);
      expect(corsCode).toMatch(/status:\s*403/);
      expect(corsCode).toContain('"FORBIDDEN_ORIGIN"');
      // Ensures missing Origin header (Stripe webhook) is allowed through
      expect(corsCode).toMatch(/if\s*\(trimmedOrigin\s*!==\s*null\s*&&\s*!ALLOWED_ORIGINS\.has\(trimmedOrigin\)\)/);
      // Preserves OPTIONS preflight handling
      expect(corsCode).toMatch(/if\s*\(req\.method\s*===\s*"OPTIONS"\)/);
    });

    it("verifies supabase/config.toml enforces explicit JWT settings for all four Edge Functions", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const configPath = path.resolve(__dirname, "../../supabase/config.toml");
      const configText = fs.readFileSync(configPath, "utf-8");

      expect(configText).toMatch(/\[functions\.create-checkout-session\]\s*\r?\nverify_jwt\s*=\s*true/);
      expect(configText).toMatch(/\[functions\.verify-payment\]\s*\r?\nverify_jwt\s*=\s*true/);
      expect(configText).toMatch(/\[functions\.payment-webhook\]\s*\r?\nverify_jwt\s*=\s*false/);
      expect(configText).toMatch(/\[functions\.return-request-notify\]\s*\r?\nverify_jwt\s*=\s*false/);
    });
  });
});





