(() => {
  const createReference = (prefix) => `${prefix}-${new Date().toISOString().slice(0,7).replace('-','')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
  const saveState = (state) => { try { sessionStorage.setItem("avodahWorkflowConfirmation", JSON.stringify(state)); } catch {} };
  document.querySelectorAll("form[data-workflow-form]").forEach((form) => {
    const workflow = form.dataset.workflow;
    const prefix = form.dataset.referencePrefix || "AWA";
    const confirmationUrl = form.dataset.confirmationUrl;
    const eventStarted = form.dataset.startedEvent;
    const eventSubmitted = form.dataset.submittedEvent;
    const status = form.querySelector("[data-form-status]");
    let started = false;
    const fields = [...form.querySelectorAll("input,select,textarea")].filter((field) => field.type !== "hidden" && field.name !== "bot-field");
    const validate = (field) => {
      const value = field.type === "checkbox" ? field.checked : field.value.trim();
      const error = field.closest("label,fieldset")?.querySelector(".field-error");
      let message = "";
      if (field.required && !value) message = field.dataset.error || "This field is required.";
      if (field.type === "email" && value && !field.validity.valid) message = "Enter a valid email address.";
      field.classList.toggle("is-invalid", Boolean(message));
      field.setAttribute("aria-invalid", String(Boolean(message)));
      if (error) error.textContent = message;
      return !message;
    };
    fields.forEach((field) => {
      const activity = () => {
        if (!started) { started = true; window.AvodahAnalytics?.track(eventStarted, { workflow, status: "started" }); }
        validate(field);
      };
      field.addEventListener("input", activity);
      field.addEventListener("change", activity);
      field.addEventListener("blur", () => validate(field));
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const valid = fields.map(validate).every(Boolean);
      if (!valid) { status.textContent = "Review the highlighted fields."; fields.find((field) => field.classList.contains("is-invalid"))?.focus(); return; }
      if (form.querySelector('[name="bot-field"]')?.value) return;
      const reference = createReference(prefix);
      form.querySelector('[name="submission_reference"]').value = reference;
      form.querySelector('[name="consent_recorded_at"]').value = new Date().toISOString();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true; const original = submit.textContent; submit.textContent = "Submitting…";
      try {
        const response = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() });
        if (!response.ok) throw new Error("submission_failed");
        const state = { workflow, status: "received", reference };
        const category = form.querySelector('[name="support_category"],[name="career_path"],[name="inquiry_category"]');
        if (category) state.category = category.value;
        saveState(state);
        window.AvodahAnalytics?.track(eventSubmitted, { workflow, status: "received", support_category: workflow === "client_support" ? category?.value : undefined, career_path: workflow === "recruitment" ? category?.value : undefined, inquiry_category: workflow === "general_inquiry" ? category?.value : undefined });
        window.location.href = confirmationUrl;
      } catch { status.textContent = "Submission is temporarily unavailable. Your entries remain on this page; use the contact fallback if needed."; }
      finally { submit.disabled = false; submit.textContent = original; }
    });
  });
})();
