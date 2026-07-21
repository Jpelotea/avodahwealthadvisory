const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

export default async (request) => {
  if (request.method !== "GET") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed" }, 405);
  }

  const webhookUrl = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
  const webhookSecret = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_SECRET");
  if (!webhookUrl || !webhookSecret) {
    return json({ ok: false, code: "SERVICE_NOT_CONFIGURED", error: "Booking service is not configured" }, 503);
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: webhookSecret, action: "availability" }),
    });
    const result = await response.json().catch(() => ({ ok: false }));
    if (!result.ok) {
      return json({ ok: false, code: result.code || "AVAILABILITY_FAILED", error: "Online scheduling is not available yet" }, 503);
    }

    return json({
      ok: true,
      timezone: result.timezone,
      owner: result.owner,
      duration_minutes: result.duration_minutes,
      slot_interval_minutes: result.slot_interval_minutes,
      buffer_before_minutes: result.buffer_before_minutes,
      buffer_after_minutes: result.buffer_after_minutes,
      days: result.days || [],
    });
  } catch (error) {
    console.error("Availability exception:", error && error.stack ? error.stack : String(error));
    return json({ ok: false, code: "AVAILABILITY_GATEWAY_ERROR", error: "Unable to check availability" }, 503);
  }
};

export const config = { path: "/api/booking-slots" };
