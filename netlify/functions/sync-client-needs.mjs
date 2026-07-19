const BRANCHES = {
  protection: [
    ["Who or what would you most like to protect?", "protection_for"],
    ["Which concern is most important?", "protection_priority"],
  ],
  planning: [
    ["What is your main planning goal?", "planning_goal"],
    ["Where are you today?", "planning_stage"],
  ],
  loan: [
    ["What type of loan are you considering?", "loan_type"],
    ["When do you expect to apply?", "loan_timing"],
  ],
  business: [
    ["What would you like to address first?", "business_need"],
    ["What best describes your stage?", "business_stage"],
  ],
  nonlife: [
    ["What needs protection?", "asset_to_protect"],
    ["Do you currently have coverage?", "coverage_status"],
  ],
  travel: [
    ["What support do you need?", "travel_need"],
    ["When is your expected travel?", "travel_timing"],
  ],
};

const clean = (value) => String(value ?? "").trim();

export default {
  async formSubmitted(event) {
    const data = event.data || {};

    if (clean(data["form-name"]) !== "client-needs-check") return;

    const webhookUrl = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
    const webhookSecret = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_SECRET");

    if (!webhookUrl || !webhookSecret) {
      console.error("Google Sheets sync is not configured.");
      return;
    }

    const branch = BRANCHES[clean(data.primary_need)] || [];
    const first = branch[0] || ["", ""];
    const second = branch[1] || ["", ""];
    const submissionId = crypto.randomUUID();

    const row = [
      submissionId,
      new Date().toISOString(),
      clean(data.primary_need_label || data.primary_need),
      clean(data.service_path),
      first[0],
      clean(data[first[1]]),
      second[0],
      clean(data[second[1]]),
      clean(data.book_consultation),
      clean(data.full_name),
      clean(data.mobile_number),
      clean(data.email),
      clean(data.location),
      clean(data.preferred_contact_method),
      clean(data.preferred_schedule),
      clean(data.additional_notes),
      clean(data.consent),
      "New",
      "",
      "",
      "",
      "",
      "",
      "client-needs-check",
    ];

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: webhookSecret, row }),
    });

    const result = await response.json().catch(() => ({ ok: false }));

    if (!response.ok || !result.ok) {
      throw new Error(`Google Sheets sync failed with HTTP ${response.status}`);
    }

    console.log(`Synced client-needs submission ${submissionId}.`);
  },
};
