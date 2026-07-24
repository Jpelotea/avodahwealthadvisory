(() => {
  const read = () => {
    try { return JSON.parse(sessionStorage.getItem("avodahWorkflowConfirmation") || sessionStorage.getItem("avodahConfirmationState") || "null"); }
    catch { return null; }
  };
  const state = read();
  const text = (selector, value) => { const element = document.querySelector(selector); if (element && value) element.textContent = value; };
  if (!state) {
    text("[data-confirmation-status]", "Confirmation details are not available in this browser session.");
    return;
  }
  text("[data-confirmation-reference]", state.reference);
  text("[data-confirmation-category]", state.category);
  text("[data-confirmation-status]", state.status === "received" ? "Received" : state.state?.replaceAll("_", " "));
  if (state.start) {
    const formatted = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "full", timeStyle: "short" }).format(new Date(state.start));
    text("[data-confirmation-date]", formatted);
  }
  text("[data-confirmation-method]", state.meeting_method);
  const manage = document.querySelector("[data-confirmation-manage]");
  if (manage && state.management_url) { manage.href = state.management_url; manage.hidden = false; }
  const meet = document.querySelector("[data-confirmation-meet]");
  if (meet && state.meet_link) { meet.href = state.meet_link; meet.hidden = false; }
})();
