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
const ATTRIBUTION_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "campaign_id",
  "adset_id",
  "ad_id",
  "fbclid",
  "landing_page",
  "referrer",
];

const cleanAttribution = (value) =>
  clean(value).replace(/[|\r\n]+/g, " ").replace(/\s+/g, " ").slice(0, 500);

const buildAttributionPayload = (data, formName) => {
  const parts = ["form_name=" + cleanAttribution(formName || "unknown")];
  const leadSource = cleanAttribution(data.lead_source);
  const sourcePage = cleanAttribution(data.source_page);

  if (leadSource) parts.push("lead_source=" + leadSource);
  if (sourcePage) parts.push("source_page=" + sourcePage);

  ATTRIBUTION_FIELDS.forEach((field) => {
    const value = cleanAttribution(data[field]);
    if (value) parts.push(field + "=" + value);
  });

  return parts.join(" | ");
};

const buildClientNeedsRow = (data, submissionId, submittedAt, formName) => {
  const branch = BRANCHES[clean(data.primary_need)] || [];
  const first = branch[0] || ["", ""];
  const second = branch[1] || ["", ""];

  return [
    submissionId,
    submittedAt,
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
    buildAttributionPayload(data, formName),
  ];
};

const buildConsultationRow = (data, submissionId, submittedAt, formName) => {
  const inquiryType = clean(data.inquiry_type) || "General Inquiry";
  const leadSource = clean(data.lead_source) || "Website Consultation Form";

  return [
    submissionId,
    submittedAt,
    inquiryType,
    "Consultation Request",
    "Inquiry Type",
    inquiryType,
    "Website Form",
    leadSource,
    "Yes",
    clean(data.full_name),
    clean(data.mobile_number),
    clean(data.email),
    clean(data.location),
    clean(data.preferred_contact_method),
    clean(data.preferred_schedule),
    clean(data.message),
    clean(data.consent),
    "New",
    "",
    "",
    "",
    "",
    "",
    buildAttributionPayload(data, formName),
  ];
};

export default {
  async formSubmitted(event) {
    const data = event.data || {};
    const formName = clean(data["form-name"]);

    // Netlify may omit the hidden form-name field from a verified event.
    const isClientNeedsCheck =
      formName === "client-needs-check" ||
      (Boolean(clean(data.primary_need)) && Boolean(clean(data.service_path)));
    const isConsultation =
      formName === "consultation" ||
      (Boolean(clean(data.inquiry_type)) && Boolean(clean(data.full_name)));

    if (!isClientNeedsCheck && !isConsultation) return;

    console.log("Received a verified Avodah website lead submission.");

    const webhookUrl = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
    const webhookSecret = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_SECRET");

    if (!webhookUrl || !webhookSecret) {
      throw new Error("Google Sheets sync is missing its Netlify environment variables.");
    }

    const requestedSubmissionId = clean(data.lead_submission_id);
    const submissionId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedSubmissionId)
      ? requestedSubmissionId
      : crypto.randomUUID();
    const submittedAt = new Date().toISOString();
    const row = isClientNeedsCheck
      ? buildClientNeedsRow(data, submissionId, submittedAt, formName || "client-needs-check")
      : buildConsultationRow(data, submissionId, submittedAt, formName || "consultation");

    if (row.length !== 24) {
      throw new Error("Lead row does not match the 24-column Google Sheets contract.");
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: webhookSecret, row }),
    });

   const result = await response.json().catch(() => ({
  ok: false,
  code: "INVALID_RESPONSE",
  error: "Apps Script returned invalid JSON",
}));

if (!response.ok || !result.ok) {
  console.error(
    "Google Sheets sync response:",
    JSON.stringify({
      http_status: response.status,
      code: result.code || "UNKNOWN",
      error: result.error || "Unknown Apps Script error",
    })
  );

  throw new Error(
    `Google Sheets sync failed: ${result.code || "UNKNOWN"} - ${
      result.error || `HTTP ${response.status}`
    }`
  );
}

    console.log(`Synced Avodah website lead ${submissionId} from ${formName || "verified form"}.`);
  },
};
