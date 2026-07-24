import { getSchedulingWebhookFields } from "./_lib/consultation-config.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
const appsScriptStatus = (result, fallback = 503) => { const value = Number(result?.http_status); return Number.isInteger(value) && value >= 400 && value <= 599 ? value : fallback; };
const failure = (result, status) => ({ ok: false, code: result.code || "BOOKING_FAILED", error: result.message || result.error || "Unable to create appointment", retryable: Boolean(result.retryable), lead_preserved: true, manual_followup_required: true, recovery_status: result.recovery_status || "MANUAL_FOLLOW_UP_REQUIRED", failed_action: result.failed_action || "booking", recovery_recorded: Boolean(result.recovery_recorded), administrator_notified: Boolean(result.administrator_notified), http_status: status });

export default async (request) => {
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed" }, 405);
  const webhookUrl = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
  const webhookSecret = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_SECRET");
  if (!webhookUrl || !webhookSecret) return json(failure({ code: "SERVICE_NOT_CONFIGURED", error: "Booking service is not configured" }, 503), 503);
  try {
    const data = await request.json();
    const leadId = String(data.lead_id || "").trim();
    const start = String(data.start || "").trim();
    const idempotencyKey = String(data.idempotency_key || crypto.randomUUID()).trim();
    if (!UUID_PATTERN.test(leadId) || !start || Number.isNaN(new Date(start).getTime())) return json({ ok: false, code: "INVALID_PAYLOAD", error: "Invalid booking request" }, 400);
    const response = await fetch(webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ secret: webhookSecret, action: "book", lead_id: leadId, start, idempotency_key: idempotencyKey, scheduling: getSchedulingWebhookFields() }) });
    const result = await response.json().catch(() => ({ ok: false, code: "INVALID_RESPONSE", error: "Apps Script returned invalid JSON", failed_action: "google_sheets_webhook" }));
    if (!result.ok) {
      const status = appsScriptStatus(result);
      console.error("Booking Apps Script response:", JSON.stringify({ lead_id: leadId, http_status: result.http_status || response.status, code: result.code || "BOOKING_FAILED", failed_action: result.failed_action || "booking", retryable: Boolean(result.retryable) }));
      return json(failure(result, status), status);
    }
    return json({ ok: true, code: result.code || "BOOKING_CREATED", already_booked: Boolean(result.already_booked), booking_id: result.booking_id || "", start: result.start || "", end: result.end || "", meet_link: result.meet_link || "", management_url: result.management_url || "", reconciliation_required: Boolean(result.reconciliation_required), calendar_created: result.calendar_created !== false, meet_created: result.meet_created !== false && Boolean(result.meet_link), email_sent: result.email_sent === true, operations_hub_synced: result.operations_hub_synced !== false && !result.reconciliation_required, warnings: Array.isArray(result.warnings) ? result.warnings.slice(0, 10) : [] });
  } catch (error) {
    console.error("Booking function exception:", error?.stack || String(error));
    return json(failure({ code: "BOOKING_GATEWAY_ERROR", error: "Unable to create appointment", retryable: true, failed_action: "booking_gateway" }, 503), 503);
  }
};

export const config = { path: "/api/book-consultation" };
