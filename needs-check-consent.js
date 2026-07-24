(() => {
  "use strict";

  const setup = () => {
    const form = document.querySelector('#needs-form[name="client-needs-check"]');
    if (!form || form.dataset.consentSeparated === "true") return;
    form.dataset.consentSeparated = "true";

    const legacy = form.querySelector('input[name="consent"]');
    if (!legacy) return;
    legacy.name = "processing_consent";
    legacy.value = "Yes";
    legacy.dataset.error = "Please acknowledge processing of your consultation request.";

    const container = legacy.closest("label");
    const hidden = document.createElement("div");
    hidden.hidden = true;
    hidden.innerHTML = `
      <input type="hidden" name="consent" value="">
      <input type="hidden" name="processing_consent_version" value="needs-check-processing-v1-2026-07-24">
      <input type="hidden" name="marketing_consent_version" value="marketing-v1-2026-07-24">
      <input type="hidden" name="consent_recorded_at" value="">`;
    container?.before(hidden);

    const optional = document.createElement("label");
    optional.className = container?.className || "consent";
    optional.innerHTML = `
      <input type="checkbox" name="marketing_consent" value="Yes">
      <span><strong>Optional marketing permission:</strong> I would like future educational updates, campaigns, or promotional messages. This is optional, unchecked by default, and does not affect this request.</span>`;
    container?.after(optional);

    const updateRequiredState = () => {
      const wantsContact = form.querySelector('input[name="book_consultation"]:checked')?.value === "Yes";
      legacy.required = wantsContact;
    };

    form.querySelectorAll('input[name="book_consultation"]').forEach((control) => {
      control.addEventListener("change", updateRequiredState);
    });
    updateRequiredState();

    form.addEventListener("submit", () => {
      const compatibility = form.querySelector('input[type="hidden"][name="consent"]');
      if (compatibility) compatibility.value = legacy.checked ? "Yes" : "";
      const recordedAt = form.querySelector('input[name="consent_recorded_at"]');
      if (recordedAt) recordedAt.value = new Date().toISOString();
    }, { capture: true });
  };

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", setup, { once: true })
    : setup();
})();
