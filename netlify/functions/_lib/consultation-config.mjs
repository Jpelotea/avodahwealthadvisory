const integerSetting = (name, fallback, { min, max, optional = false } = {}) => {
  const raw = Netlify.env.get(name);
  if ((raw === undefined || raw === null || raw === "") && optional) return undefined;
  const parsed = Number.parseInt(raw ?? String(fallback), 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
};

export const getConsultationConfig = () => ({
  duration_minutes: integerSetting("CONSULTATION_DURATION_MINUTES", 30, { min: 15, max: 180 }),
  buffer_before_minutes: integerSetting("CONSULTATION_BUFFER_BEFORE_MINUTES", 30, { min: 0, max: 180 }),
  buffer_after_minutes: integerSetting("CONSULTATION_BUFFER_AFTER_MINUTES", 30, { min: 0, max: 180 }),
  min_notice_hours: integerSetting("CONSULTATION_MIN_NOTICE_HOURS", undefined, { min: 0, max: 168, optional: true }),
  max_advance_days: integerSetting("CONSULTATION_MAX_ADVANCE_DAYS", undefined, { min: 1, max: 365, optional: true }),
});

export const getSchedulingWebhookFields = () => {
  const config = getConsultationConfig();
  return Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined));
};
