const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const appsScriptStatus = (result, fallback = 503) => {
  const value = Number(result && result.http_status);
  return Number.isInteger(value) && value >= 400 && value <= 599 ? value : fallback;
};

export default async (request) => {
  if (request.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed" }, 405);
  }

  const webhookUrl = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
  const webhookSecret = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_SECRET");

  if (!webhookUrl || !webhookSecret) {
    return json({ ok: false, code: "SERVICE_NOT_CONFIGURED", error: "Booking service is not configured" }, 503);
  }

  try {
    const data = await request.json();
    const leadId = String(data.lead_id || "").trim();
    const start = String(data.start || "").trim();
    const idempotencyKey = String(data.idempotency_key || crypto.randomUUID()).trim();
    const startDate = new Date(start);

    if (!UUID_PATTERN.test(leadId) || !start || Number.isNaN(startDate.getTime())) {
      return json({ ok: false, code: "INVALID_PAYLOAD", error: "Invalid booking request" }, 400);
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: webhookSecret,
        action: "book",
        lead_id: leadId,
        start,
        idempotency_key: idempotencyKey,
      }),
    });

    const result = await response.json().catch(() => ({
      ok: false,
      code: "INVALID_RESPONSE",
      error: "Apps Script returned invalid JSON",
    }));

    if (!result.ok) {
      console.error("Booking Apps Script response:", JSON.stringify({
        http_status: result.http_status || response.status,
        code: result.code || "BOOKING_FAILED",
        message: result.message || result.error || "Unknown booking error",
      }));

      return json(
        {
          ok: false,
          code: result.code || "BOOKING_FAILED",
          error: result.message || result.error || "Unable to create appointment",
          retryable: Boolean(result.retryable),
        },
        appsScriptStatus(result)
      );
    }

    return json({
      ok: true,
      code: result.code || "BOOKING_CREATED",
      already_booked: Boolean(result.already_booked),
      booking_id: result.booking_id || "",
      start: result.start || "",
      end: result.end || "",
      meet_link: result.meet_link || "",
      management_url: result.management_url || "",
      reconciliation_required: Boolean(result.reconciliation_required),
    });
  } catch (error) {
    console.error("Booking function exception:", error && error.stack ? error.stack : String(error));
    return json({ ok: false, code: "BOOKING_GATEWAY_ERROR", error: "Unable to create appointment" }, 503);
  }
};

export const config = {
  path: "/api/book-consultation",
};
