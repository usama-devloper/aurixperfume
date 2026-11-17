import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/auth.ts";

interface NotificationPayload {
  event: "REQUEST_CREATED" | "STATUS_UPDATED";
  reference_number: string;
  status?: "pending" | "under_review" | "approved" | "rejected" | "resolved";
  admin_notes?: string | null;
}

const OFFICIAL_SUPPORT_EMAIL = "aurixperfume25@gmail.com";
const SENDER_EMAIL = "AURIX Concierge <notifications@aurixperfume.in>";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return err("Method Not Allowed", "METHOD_NOT_ALLOWED", 405);
  }

  try {
    const rawBody = await req.json();
    const payload: NotificationPayload = rawBody;

    if (!payload.reference_number || !payload.event) {
      return err("Invalid request payload", "VALIDATION_ERROR", 400);
    }

    const cleanRef = payload.reference_number.trim().toUpperCase();

    // 1. Edge Function Authorization & Database Resolution
    const serviceClient = getServiceSupabaseClient();
    const { data: record, error: recordErr } = await serviceClient
      .from("order_return_requests")
      .select("id, reference_number, order_number, customer_email, customer_name, product_name, request_type, status, admin_notes, created_at")
      .eq("reference_number", cleanRef)
      .maybeSingle();

    // If reference does not exist in the database, reject immediately
    if (recordErr || !record) {
      return err("Return inquiry could not be verified.", "NOT_FOUND", 404);
    }

    // 2. Event-Specific Protection & Anti-Replay
    let eventKey = "";

    if (payload.event === "REQUEST_CREATED") {
      // Must be in pending status
      if (record.status !== "pending") {
        return err("Notification request cannot be processed.", "INVALID_STATE", 400);
      }

      // Anti-replay: creation must be within the last 15 minutes
      const createdAtMs = new Date(record.created_at).getTime();
      if (Date.now() - createdAtMs > 15 * 60 * 1000) {
        return err("Notification request expired.", "EXPIRED", 400);
      }

      eventKey = `REQUEST_CREATED:${cleanRef}`;
    } else if (payload.event === "STATUS_UPDATED") {
      // STATUS_UPDATED requires strictly authenticated administrative privileges
      try {
        await requireAdmin(req);
      } catch (_authErr: any) {
        return err("Administrative privileges required to dispatch status notifications.", "FORBIDDEN", 403);
      }

      const targetStatus = payload.status || record.status;
      eventKey = `STATUS_UPDATED:${cleanRef}:${targetStatus}`;
    } else {
      return err("Unknown notification event.", "BAD_REQUEST", 400);
    }

    // 3. Resolve recipient and details strictly from verified database record (never trust client)
    const resolvedEmail = record.customer_email;
    const resolvedName = record.customer_name || "Valued Client";
    const resolvedOrder = record.order_number;
    const resolvedProduct = record.product_name || "Artisanal Fragrance";
    const resolvedType = record.request_type;
    const resolvedStatus = payload.event === "STATUS_UPDATED" && payload.status ? payload.status : record.status;
    const resolvedNotes = payload.admin_notes || record.admin_notes;

    // 4. Task 3: Database-Backed Durable Deduplication & Atomic Outbox Claiming
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
      return err("Failed to initialize notification dispatch queue.", "DATABASE_ERROR", 500);
    }

    const claim = typeof claimData === "string" ? JSON.parse(claimData) : claimData;

    if (claim.action === "already_sent") {
      return ok({
        success: true,
        emailSent: false,
        deliveryStatus: "duplicate_suppressed",
        referenceNumber: cleanRef,
        recipient: resolvedEmail,
      });
    }

    if (claim.action === "in_flight") {
      return ok({
        success: true,
        emailSent: false,
        deliveryStatus: "in_flight_concurrent",
        referenceNumber: cleanRef,
        recipient: resolvedEmail,
      });
    }

    if (claim.action === "exhausted") {
      return err("Maximum notification delivery attempts exceeded.", "MAX_ATTEMPTS_EXCEEDED", 429);
    }

    const idempotencyKey = claim.idempotency_key || `aurix-${Date.now()}`;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;
    let deliveryStatus = "unconfigured";

    // 5. Build Email Content
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
          <p style="font-size: 14px; line-height: 1.6; color: #44403C;">Dear ${resolvedName},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #44403C;">Your return and issue request for Order <strong>${resolvedOrder}</strong> has been received by our atelier concierge.</p>
          <div style="background-color: #FFFFFF; border: 1px solid #E7E5E4; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>Reference Code:</strong> <span style="color: #C5A880; font-family: monospace;">${cleanRef}</span></p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Product:</strong> ${resolvedProduct}</p>
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
          <p><strong>Reference:</strong> ${cleanRef}</p>
          <p><strong>Order:</strong> ${resolvedOrder}</p>
          <p><strong>Customer:</strong> ${resolvedName} (${resolvedEmail})</p>
          <p><strong>Product:</strong> ${resolvedProduct}</p>
          <p><strong>Category:</strong> ${resolvedType}</p>
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
          <p style="font-size: 14px; line-height: 1.6; color: #44403C;">Dear ${resolvedName},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #44403C;">Our atelier specialists have reviewed your request for Order <strong>${resolvedOrder}</strong>.</p>
          <div style="background-color: #FFFFFF; border: 1px solid #E7E5E4; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>Reference Code:</strong> <span style="color: #C5A880; font-family: monospace;">${cleanRef}</span></p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Current Status:</strong> <strong style="text-transform: uppercase;">${resolvedStatus.replace("_", " ")}</strong></p>
            ${resolvedNotes ? `<p style="margin: 8px 0 4px 0; font-size: 13px; color: #44403C;"><strong>Concierge Notes:</strong><br/><em>${resolvedNotes}</em></p>` : ""}
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #78716C;">If you have any questions, our concierge team remains at your service at ${OFFICIAL_SUPPORT_EMAIL}.</p>
          <div style="border-top: 1px solid #E7E5E4; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #A8A29E; text-align: center;">
            AURIX Perfume — Ahmedabad, Gujarat, India
          </div>
        </div>
      `;
    }

    // 6. Dispatch via Resend (with Provider Idempotency-Key)
    if (resendApiKey) {
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

        if (payload.event === "REQUEST_CREATED" && atelierSubject) {
          await fetch("https://api.resend.com/emails", {
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
        }

        if (resCustomer.ok) {
          emailSent = true;
          deliveryStatus = "sent";
          await serviceClient.rpc("finalize_return_notification_event", {
            p_event_key: eventKey,
            p_status: "sent",
          });
        } else {
          deliveryStatus = "failed";
          const errText = await resCustomer.text();
          await serviceClient.rpc("finalize_return_notification_event", {
            p_event_key: eventKey,
            p_status: "failed",
            p_error: `Resend HTTP ${resCustomer.status}: ${errText.substring(0, 500)}`,
          });
        }
      } catch (err: any) {
        console.error("Resend API error:", err);
        deliveryStatus = "error";
        await serviceClient.rpc("finalize_return_notification_event", {
          p_event_key: eventKey,
          p_status: "failed",
          p_error: err?.message || "Network error",
        });
      }
    } else {
      // Simulated delivery when RESEND_API_KEY is not configured
      console.log(`[NOTIFICATION_SIMULATED: RESEND_API_KEY unconfigured] To: ${resolvedEmail}, Subject: ${customerSubject}, Ref: ${cleanRef}`);
      emailSent = false;
      deliveryStatus = "simulated_no_api_key";
      await serviceClient.rpc("finalize_return_notification_event", {
        p_event_key: eventKey,
        p_status: "sent",
      });
    }

    return ok({
      success: true,
      emailSent,
      deliveryStatus,
      recipient: resolvedEmail,
      referenceNumber: cleanRef,
      providerConfigured: !!resendApiKey,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return err(error.message || "Failed to process notification", "SERVER_ERROR", 500);
  }
});
