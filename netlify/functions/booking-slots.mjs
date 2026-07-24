import { getConsultationConfig, getSchedulingWebhookFields } from "./_lib/consultation-config.mjs";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
const isPreviewSimulation = () => {
  const context = Netlify.env.get("CONTEXT") || "";
  return (context === "branch-deploy" || context === "deploy-preview") && Netlify.env.get("PREVIEW_INTEGRATION_MODE") !== "live";
};
const previewAvailability = () => {
  const config = getConsultationConfig();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
  const label = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" });
  const days = [];
  for (let offset = 1; offset <= 10 && days.length < 5; offset += 1) {
    const date = new Date(Date.now() + offset * 86400000);
    if (new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short" }).format(date) === "Sun") continue;
    const dateString = day.format(date);
    const slots = ["10:00", "14:00"].map((time) => ({ label: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }).format(new Date(`${dateString}T${time}:00+08:00`)), start: `${dateString}T${time}:00+08:00` }));
    days.push({ date: dateString, label: label.format(date), slots });
  }
  return { ok: true, code: "PREVIEW_AVAILABILITY_SIMULATED", preview_simulated: true, timezone: "Asia/Manila", owner: "Preview simulation", duration_minutes: config.duration_minutes, slot_interval_minutes: config.duration_minutes + config.buffer_after_minutes, buffer_before_minutes: config.buffer_before_minutes, buffer_after_minutes: config.buffer_after_minutes, min_notice_hours: config.min_notice_hours, max_advance_days: config.max_advance_days, days };
};

export default async (request) => {
  if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed" }, 405);
  if (isPreviewSimulation()) return json(previewAvailability());
  const webhookUrl = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
  const webhookSecret = Netlify.env.get("GOOGLE_SHEETS_WEBHOOK_SECRET");
  if (!webhookUrl || !webhookSecret) return json({ ok: false, code: "SERVICE_NOT_CONFIGURED", error: "Booking service is not configured" }, 503);
  try {
    const response = await fetch(webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ secret: webhookSecret, action: "availability", scheduling: getSchedulingWebhookFields() }) });
    const result = await response.json().catch(() => ({ ok: false }));
    if (!result.ok) return json({ ok: false, code: result.code || "AVAILABILITY_FAILED", error: "Online scheduling is not available yet" }, 503);
    return json({ ok: true, timezone: result.timezone, owner: result.owner, duration_minutes: result.duration_minutes, slot_interval_minutes: result.slot_interval_minutes, buffer_before_minutes: result.buffer_before_minutes, buffer_after_minutes: result.buffer_after_minutes, min_notice_hours: result.min_notice_hours, max_advance_days: result.max_advance_days, days: result.days || [] });
  } catch (error) {
    console.error("Availability exception:", error?.stack || String(error));
    return json({ ok: false, code: "AVAILABILITY_GATEWAY_ERROR", error: "Unable to check availability" }, 503);
  }
};

export const config = { path: "/api/booking-slots" };
