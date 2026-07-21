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

export default async (request) => {
  if (request.method !== "POST") {
    return json(
      {
        ok: false,
        error: "Method not allowed",
      },
      405
    );
  }

  const webhookUrl = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
  const webhookSecret = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_SECRET");

  if (!webhookUrl || !webhookSecret) {
    return json(
      {
        ok: false,
        error: "Booking service is not configured",
      },
      503
    );
  }

  try {
    const data = await request.json();

    const leadId = String(data.lead_id || "").trim();
    const start = String(data.start || "").trim();
    const startDate = new Date(start);

    if (
      !UUID_PATTERN.test(leadId) ||
      !start ||
      Number.isNaN(startDate.getTime())
    ) {
      return json(
        {
          ok: false,
          error: "Invalid booking request",
        },
        400
      );
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        secret: webhookSecret,
        action: "book",
        lead_id: leadId,
        start,
      }),
    });

    const result = await response.json().catch(() => ({
      ok: false,
      code: "INVALID_RESPONSE",
      error: "Apps Script returned invalid JSON",
    }));

    if (!response.ok || !result.ok) {
      const conflict = result.code === "SLOT_UNAVAILABLE";

      console.error(
        "Booking Apps Script response:",
        JSON.stringify({
          http_status: response.status,
          code: result.code || "BOOKING_FAILED",
          error: result.error || "Unknown booking error",
          diagnostic: result.diagnostic || "",
        })
      );

      return json(
        {
          ok: false,
          code: result.code || "BOOKING_FAILED",
          error: conflict
            ? "The selected time is no longer available"
            : result.error || "Unable to create appointment",
        },
        conflict ? 409 : 503
      );
    }

    return json({
      ok: true,
      already_booked: Boolean(result.already_booked),
      start: result.start,
      end: result.end,
      meet_link: result.meet_link || "",
    });
  } catch (error) {
    console.error(
      "Booking function exception:",
      error && error.stack ? error.stack : String(error)
    );

    return json(
      {
        ok: false,
        error: "Unable to create appointment",
      },
      503
    );
  }
};

export const config = {
  path: "/api/book-consultation",
};
