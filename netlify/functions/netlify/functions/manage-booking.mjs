const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,200}$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });

const ACTION_MAP = {
  status: "booking_status",
  reschedule: "reschedule",
  cancel: "cancel",
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
    const action = String(data.action || "status").trim().toLowerCase();
    const mappedAction = ACTION_MAP[action];
    const managementToken = String(data.management_token || "").trim();

    if (!mappedAction || !TOKEN_PATTERN.test(managementToken)) {
      return json({ ok: false, code: "INVALID_MANAGEMENT_REQUEST", error: "Invalid appointment management request" }, 400);
    }

    const payload = {
      secret: webhookSecret,
      action: mappedAction,
      management_token: managementToken,
    };

    if (action === "reschedule") {
      const start = String(data.start || "").trim();
      const startDate = new Date(start);
      if (!start || Number.isNaN(startDate.getTime())) {
        return json({ ok: false, code: "INVALID_SLOT", error: "Invalid reschedule time" }, 400);
      }
      payload.start = start;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({
      ok: false,
      code: "INVALID_RESPONSE",
      message: "Apps Script returned invalid JSON",
      http_status: 503,
    }));

    const semanticStatus = Number(result.http_status);
    const status = Number.isInteger(semanticStatus) && semanticStatus >= 400
      ? semanticStatus
      : result.ok
        ? 200
        : 503;

    return json(result, status);
  } catch (error) {
    console.error("Manage booking exception:", error && error.stack ? error.stack : String(error));
    return json({ ok: false, code: "MANAGEMENT_GATEWAY_ERROR", error: "Unable to manage appointment" }, 503);
  }
};

export const config = {
  path: "/api/manage-booking",
};
