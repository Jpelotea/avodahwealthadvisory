(() => {
  const ALLOWED_EVENTS = new Set([
    "consultation_form_started",
    "consultation_form_completed",
    "consultation_booking_started",
    "consultation_booking_completed",
    "consultation_manual_followup",
    "consultation_booking_failed",
    "client_support_started",
    "client_support_submitted",
    "recruitment_application_started",
    "recruitment_application_submitted",
    "general_inquiry_submitted",
    "cookie_preferences_saved",
  ]);
  const ALLOWED_PARAMETERS = new Set([
    "workflow", "status", "page_path", "campaign_source", "campaign_medium",
    "campaign_name", "meeting_method", "support_category", "career_path",
    "inquiry_category", "analytics_enabled", "marketing_enabled", "retryable",
    "duplicate_detected",
  ]);
  const PII_KEYS = /name|email|phone|mobile|messenger|message|policy|application_reference|resume|appointment_note|lead_id|booking_id|reference/i;
  const cleanValue = (value) => {
    if (typeof value === "boolean" || typeof value === "number") return value;
    return String(value ?? "").replace(/[\r\n\t]/g, " ").slice(0, 100);
  };
  const sanitize = (parameters = {}) => {
    const safe = {};
    Object.entries(parameters).forEach(([key, value]) => {
      if (!ALLOWED_PARAMETERS.has(key) || PII_KEYS.test(key) || value === undefined || value === null || value === "") return;
      safe[key] = cleanValue(value);
    });
    safe.page_path = window.location.pathname;
    return safe;
  };
  const track = (eventName, parameters = {}) => {
    if (!ALLOWED_EVENTS.has(eventName)) return false;
    const consent = window.AvodahCookiePreferences?.get?.();
    if (!consent?.analytics) return false;
    if (typeof window.gtag === "function") window.gtag("event", eventName, sanitize(parameters));
    return true;
  };
  window.AvodahAnalytics = { track, sanitize, allowedEvents: [...ALLOWED_EVENTS] };
})();
