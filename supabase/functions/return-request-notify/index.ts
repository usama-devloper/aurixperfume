import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";

interface NotificationPayload {
  event: "REQUEST_CREATED" | "STATUS_UPDATED";
  reference_number: string;
  order_number?: string;
  customer_email?: string;
  reservation_token?: string | null;
  status?: "pending" | "under_review" | "approved" | "rejected" | "resolved";
  admin_notes?: string | null;
}

const OFFICIAL_SUPPORT_EMAIL = "aurixperfume25@gmail.com";
const SENDER_EMAIL = "AURIX Concierge <notifications@aurixperfume.in>";

function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return err("Method Not Allowed", "METHOD_NOT_ALLOWED", 405, undefined, req);
  }

  try {
    const rawBody = await req.json();
    const payload: NotificationPayload = rawBody;

    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.reference_number !== "string" ||
      typeof payload.event !== "string"
    ) {
      return err("Invalid request payload", "VALIDATION_ERROR", 400, undefined, req);
    }

    const cleanRef = payload.reference_number.trim().toUpperCase();
    if (!cleanRef) {
      return err("Invalid request payload", "VALIDATION_ERROR", 400, undefined, req);
    }

    if (payload.event !== "REQUEST_CREATED" && payload.event !== "STATUS_UPDATED") {
      return err("Unknown notification event.", "BAD_REQUEST", 400, undefined, req);
    }

    // 1. Authorization BEFORE Database Lookup
    // For STATUS_UPDATED, strictly enforce requireAdmin(req) BEFORE querying order_return_requests
    // so unauthenticated callers cannot distinguish existing references from nonexistent ones.
    let cleanOrderInput = "";
    let cleanEmailInput = "";
    let suppliedToken = "";

    if (payload.event === "STATUS_UPDATED") {
      try {
        await requireAdmin(req);
      } catch (_authErr: any) {
        return err(
          "Administrative privileges required to dispatch status notifications.",
          "FORBIDDEN",
          403,
          undefined,
          req
        );
      }
    } else {
      // Guest REQUEST_CREATED strictly requires order_number, customer_email, AND server-issued reservation_token
      cleanOrderInput = typeof payload.order_number === "string"
        ? payload.order_number.trim().toUpperCase()
        : "";
      cleanEmailInput = typeof payload.customer_email === "string"
        ? payload.customer_email.trim().toLowerCase()
        : "";
      suppliedToken = typeof payload.reservation_token === "string"
        ? payload.reservation_token.trim()
        : "";

      if (!cleanOrderInput || !cleanEmailInput || !suppliedToken) {
        return err(
          "Unable to verify notification authorization.",
          "UNAUTHORIZED",
          403,
          undefined,
          req
        );
      }
    }

    // 2. Service-Role Database Resolution (only after pre-lookup authorization passes)
    const serviceClient = getServiceSupabaseClient();
    const { data: record, error: recordErr } = await serviceClient
      .from("order_return_requests")
      .select("id, reference_number, order_number, customer_email, customer_name, product_name, request_type, description, status, admin_notes, created_at")
      .eq("reference_number", cleanRef)
      .maybeSingle();

    if (recordErr || !record) {
      if (payload.event === "REQUEST_CREATED") {
        // Uniform generic authorization error: never reveal whether reference, order, or email failed
        return err(
          "Unable to verify notification authorization.",
          "UNAUTHORIZED",
          403,
          undefined,
          req
        );
      }
      return err("Return inquiry could not be verified.", "NOT_FOUND", 404, undefined, req);
    }

    // 3. Event-Specific Ownership Verification & Anti-Replay
    let eventKey = "";

    if (payload.event === "REQUEST_CREATED") {
      const dbOrder = String(record.order_number || "").trim().toUpperCase();
      const dbEmail = String(record.customer_email || "").trim().toLowerCase();

      const orderMatches = constantTimeEqual(cleanOrderInput, dbOrder);
      const emailMatches = constantTimeEqual(cleanEmailInput, dbEmail);

      if (!orderMatches || !emailMatches) {
        return err(
          "Unable to verify notification authorization.",
          "UNAUTHORIZED",
          403,
          undefined,
          req
        );
      }

      // Mandatory server-issued reservation_token validation against return_reference_reservations
      // Never fall back to order_number/email-only authorization.
      const { data: reservation, error: resErr } = await serviceClient
        .from("return_reference_reservations")
        .select("reference_number, order_number, customer_email, reservation_token, used_at")
        .eq("reference_number", cleanRef)
        .maybeSingle();

      const storedRef = String(reservation?.reference_number || "").trim().toUpperCase();
      const storedToken = String(reservation?.reservation_token || "").trim();
      const storedResOrder = String(reservation?.order_number || "").trim().toUpperCase();
      const storedResEmail = String(reservation?.customer_email || "").trim().toLowerCase();

      const tokenValid =
        !resErr &&
        Boolean(reservation) &&
        Boolean(reservation.used_at) &&
        storedToken.length > 0 &&
        constantTimeEqual(cleanRef, storedRef) &&
        constantTimeEqual(suppliedToken, storedToken) &&
        constantTimeEqual(dbOrder, storedResOrder) &&
        constantTimeEqual(dbEmail, storedResEmail);

      if (!tokenValid) {
        return err(
          "Unable to verify notification authorization.",
          "UNAUTHORIZED",
          403,
          undefined,
          req
        );
      }

      // Anti-replay: must be pending and created within the last 15 minutes
      const createdAtMs = new Date(record.created_at).getTime();
      if (record.status !== "pending" || Date.now() - createdAtMs > 15 * 60 * 1000) {
        return err(
          "Unable to verify notification authorization.",
          "UNAUTHORIZED",
          403,
          undefined,
          req
        );
      }

      eventKey = `REQUEST_CREATED:${cleanRef}`;
    } else {
      const targetStatus = payload.status || record.status;
      eventKey = `STATUS_UPDATED:${cleanRef}:${targetStatus}`;
    }

    // 4. Resolve recipient and details strictly from verified database record (never trust client)
    const resolvedEmail = record.customer_email;
    const resolvedName = record.customer_name || "Valued Client";
    const resolvedOrder = record.order_number;
    const resolvedProduct = record.product_name || "Artisanal Fragrance";
    const resolvedType = record.request_type;
    const resolvedDescription = record.description || "";
    const resolvedStatus = payload.event === "STATUS_UPDATED" && payload.status ? payload.status : record.status;
    const resolvedNotes = payload.admin_notes || record.admin_notes;

    // 5. Verify Email Provider Configuration BEFORE claiming the outbox event.
    // CRITICAL: Never mark an event as 'sent' (or burn retry attempts) when RESEND_API_KEY is missing,
    // so delivery is never permanently suppressed once configured.
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error(`[return-request-notify] RESEND_API_KEY is missing; email delivery deferred for Ref: ${cleanRef}`);
      return err(
        "Email notification provider is not configured. Delivery was not marked as sent and remains eligible once configured.",
        "PROVIDER_UNCONFIGURED",
        503,
        {
          event: payload.event,
          emailSent: false,
          customerEmailSent: false,
          atelierEmailSent: false,
          deliveryStatus: "unconfigured",
          providerConfigured: false,
          referenceNumber: cleanRef,
        },
        req
      );
    }

    // 6. Task 3: Database-Backed Durable Deduplication & Atomic Outbox Claiming
    const { data: claimData, error: claimErr } = await serviceClient.rpc("claim_return_notification_event", {
      p_event_key: eventKey,
      p_reference_number: cleanRef,
      p_event_type: payload.event,
      p_recipient_email: resolvedEmail,
      p_payload: { order_number: resolvedOrder, status: resolvedStatus },
      p_lease_seconds: 90,
    });

    if (claimErr) {
      console.error("Durable claim error:", claimErr);
      return err("Failed to initialize notification dispatch queue.", "DATABASE_ERROR", 500, undefined, req);
    }

    const claim = typeof claimData === "string" ? JSON.parse(claimData) : claimData;

    if (claim.action === "already_sent") {
      return ok(
        {
          success: true,
          event: payload.event,
          emailSent: false,
          deliveryStatus: "duplicate_suppressed",
          message: "Notification has already been delivered.",
          referenceNumber: cleanRef,
        },
        undefined,
        200,
        req
      );
    }

    if (claim.action === "in_flight") {
      return ok(
        {
          success: true,
          event: payload.event,
          emailSent: false,
          deliveryStatus: "in_flight_concurrent",
          message: "Notification delivery is currently in progress.",
          referenceNumber: cleanRef,
        },
        undefined,
        200,
        req
      );
    }

    if (claim.action === "exhausted") {
      return err("Maximum notification delivery attempts exceeded.", "MAX_ATTEMPTS_EXCEEDED", 429, undefined, req);
    }

    const idempotencyKey = claim.idempotency_key || `aurix-${Date.now()}`;
    let emailSent = false;
    let customerEmailSent = false;
    let atelierEmailSent = false;
    let deliveryStatus = "failed";

    // Escape all dynamic fields interpolated into HTML templates
    const safeRef = escapeHtml(cleanRef);
    const safeOrder = escapeHtml(resolvedOrder);
    const safeEmail = escapeHtml(resolvedEmail);
    const safeName = escapeHtml(resolvedName);
    const safeProduct = escapeHtml(resolvedProduct);
    const safeType = escapeHtml(resolvedType);
    const safeDescription = escapeHtml(resolvedDescription);
    const safeStatus = escapeHtml(resolvedStatus.replace("_", " "));
    const safeNotes = escapeHtml(resolvedNotes);

    // 6. Build Email Content
    let customerSubject = "";
    let customerHtml = "";
    let atelierSubject = "";
    let atelierHtml = "";

    if (payload.event === "REQUEST_CREATED") {
      customerSubject = `[AURIX] Return Inquiry Registered — Ref: ${cleanRef}`;
      customerHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1917; background-color: #FAF8F5;">
          <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #C5A880; padding-bottom: 16px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #C5A880; font-weight: bold;">Atelier Client Services</span>
            <h1 style="margin: 8px 0; font-size: 24px; font-weight: normal; color: #1C1917;">Inquiry Registered</h1>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #44403C;">Dear ${safeName},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #44403C;">Your return and issue request for Order <strong>${safeOrder}</strong> has been received by our atelier concierge.</p>
          <div style="background-color: #FFFFFF; border: 1px solid #E7E5E4; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>Reference Code:</strong> <span style="color: #C5A880; font-family: monospace;">${safeRef}</span></p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Product:</strong> ${safeProduct}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Status:</strong> <span style="text-transform: uppercase; font-size: 11px; background-color: #FEF3C7; padding: 2px 6px; border-radius: 4px;">Pending Review</span></p>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #78716C;">Our master compounders and fulfillment specialists will examine your request against batch distillation records within 24 to 48 business hours.</p>
          <div style="border-top: 1px solid #E7E5E4; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #A8A29E; text-align: center;">
            AURIX Perfume — Ahmedabad, Gujarat, India<br/>
            Direct Concierge: ${OFFICIAL_SUPPORT_EMAIL}
          </div>
        </div>
      `;

      atelierSubject = `[ATELIER ALERT] New Return Request — ${cleanRef} (Order: ${resolvedOrder})`;
      atelierHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
          <h2 style="color: #92400E;">New Customer Return / Issue Inquiry</h2>
          <p><strong>Reference:</strong> ${safeRef}</p>
          <p><strong>Order:</strong> ${safeOrder}</p>
          <p><strong>Customer:</strong> ${safeName} (${safeEmail})</p>
          <p><strong>Product:</strong> ${safeProduct}</p>
          <p><strong>Category:</strong> ${safeType}</p>
          ${safeDescription ? `<p><strong>Description:</strong> ${safeDescription}</p>` : ""}
          <p>Review this case in the <a href="https://aurixperfume.in/admin/returns">Admin Hub Returns Portal</a>.</p>
        </div>
      `;
    } else {
      const statusTitle = resolvedStatus === "approved" 
        ? "Return Claim Approved" 
        : resolvedStatus === "rejected" 
        ? "Return Claim Update" 
        : resolvedStatus === "resolved" 
        ? "Inquiry Resolved" 
        : "Inquiry Under Active Review";

      customerSubject = `[AURIX] Update on Request ${cleanRef} — ${statusTitle}`;
      customerHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1917; background-color: #FAF8F5;">
          <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #C5A880; padding-bottom: 16px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #C5A880; font-weight: bold;">Atelier Client Services</span>
            <h1 style="margin: 8px 0; font-size: 22px; font-weight: normal; color: #1C1917;">${statusTitle}</h1>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #44403C;">Dear ${safeName},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #44403C;">Our atelier specialists have reviewed your request for Order <strong>${safeOrder}</strong>.</p>
          <div style="background-color: #FFFFFF; border: 1px solid #E7E5E4; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>Reference Code:</strong> <span style="color: #C5A880; font-family: monospace;">${safeRef}</span></p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Current Status:</strong> <strong style="text-transform: uppercase;">${safeStatus}</strong></p>
            ${safeNotes ? `<p style="margin: 8px 0 4px 0; font-size: 13px; color: #44403C;"><strong>Concierge Notes:</strong><br/><em>${safeNotes}</em></p>` : ""}
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #78716C;">If you have any questions, our concierge team remains at your service at ${OFFICIAL_SUPPORT_EMAIL}.</p>
          <div style="border-top: 1px solid #E7E5E4; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #A8A29E; text-align: center;">
            AURIX Perfume — Ahmedabad, Gujarat, India
          </div>
        </div>
      `;
    }

    // 7. Dispatch via Resend (with Provider Idempotency-Key) and verify ALL required responses
    const atelierRequired = payload.event === "REQUEST_CREATED" && Boolean(atelierSubject);
    const deliveryErrors: string[] = [];

    try {
      const resCustomer = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
          "Idempotency-Key": `${idempotencyKey}-customer`,
        },
        body: JSON.stringify({
          from: SENDER_EMAIL,
          to: [resolvedEmail],
          subject: customerSubject,
          html: customerHtml,
        }),
      });

      if (resCustomer.ok) {
        customerEmailSent = true;
      } else {
        const errText = await resCustomer.text();
        deliveryErrors.push(`Customer email failed (HTTP ${resCustomer.status}): ${errText.substring(0, 250)}`);
      }

      if (atelierRequired) {
        const resAtelier = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
            "Idempotency-Key": `${idempotencyKey}-atelier`,
          },
          body: JSON.stringify({
            from: SENDER_EMAIL,
            to: [OFFICIAL_SUPPORT_EMAIL],
            subject: atelierSubject,
            html: atelierHtml,
          }),
        });

        if (resAtelier.ok) {
          atelierEmailSent = true;
        } else {
          const errText = await resAtelier.text();
          deliveryErrors.push(`Atelier email failed (HTTP ${resAtelier.status}): ${errText.substring(0, 250)}`);
        }
      }

      const allDelivered = customerEmailSent && (!atelierRequired || atelierEmailSent);

      if (allDelivered) {
        emailSent = true;
        deliveryStatus = "sent";
        await serviceClient.rpc("finalize_return_notification_event", {
          p_event_key: eventKey,
          p_status: "sent",
        });
      } else {
        emailSent = false;
        deliveryStatus = customerEmailSent || atelierEmailSent ? "partial_failure" : "failed";
        const combinedError = deliveryErrors.join(" | ").substring(0, 500) || "Email delivery failed";
        await serviceClient.rpc("finalize_return_notification_event", {
          p_event_key: eventKey,
          p_status: "failed",
          p_error: combinedError,
        });

        return err(
          "One or more email notifications failed to deliver and will remain eligible for retry.",
          "DELIVERY_FAILED",
          502,
          {
            event: payload.event,
            emailSent,
            customerEmailSent,
            atelierEmailSent: atelierRequired ? atelierEmailSent : undefined,
            deliveryStatus,
            referenceNumber: cleanRef,
            providerConfigured: true,
          },
          req
        );
      }
    } catch (dispatchErr: any) {
      console.error("Resend API error:", dispatchErr);
      emailSent = false;
      deliveryStatus = "error";
      await serviceClient.rpc("finalize_return_notification_event", {
        p_event_key: eventKey,
        p_status: "failed",
        p_error: dispatchErr?.message || "Network error",
      });

      return err(
        "Failed to reach email delivery provider.",
        "DELIVERY_ERROR",
        502,
        {
          event: payload.event,
          emailSent: false,
          customerEmailSent,
          atelierEmailSent: atelierRequired ? atelierEmailSent : undefined,
          deliveryStatus,
          referenceNumber: cleanRef,
          providerConfigured: true,
        },
        req
      );
    }

    return ok(
      {
        success: true,
        event: payload.event,
        emailSent,
        customerEmailSent,
        ...(atelierRequired ? { atelierEmailSent } : {}),
        deliveryStatus,
        message: "Notification dispatched successfully.",
        referenceNumber: cleanRef,
        providerConfigured: true,
      },
      undefined,
      200,
      req
    );
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("return-request-notify unhandled error:", error);
    return err("Failed to process notification", "SERVER_ERROR", 500, undefined, req);
  }
});
