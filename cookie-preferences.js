(() => {
  const STORAGE_KEY = "avodahCookiePreferences";
  const VERSION = "cookie-consent-v1-2026-07-24";
  const defaults = { essential: true, analytics: false, marketing: false, version: VERSION, saved_at: "" };
  const read = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || saved.version !== VERSION) return { ...defaults };
      return { ...defaults, analytics: Boolean(saved.analytics), marketing: Boolean(saved.marketing), saved_at: saved.saved_at || "" };
    } catch { return { ...defaults }; }
  };
  let current = read();
  const applyConsent = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
    window.gtag("consent", "update", {
      analytics_storage: current.analytics ? "granted" : "denied",
      ad_storage: current.marketing ? "granted" : "denied",
      ad_user_data: current.marketing ? "granted" : "denied",
      ad_personalization: current.marketing ? "granted" : "denied",
    });
    document.documentElement.dataset.analyticsConsent = current.analytics ? "granted" : "denied";
    document.documentElement.dataset.marketingConsent = current.marketing ? "granted" : "denied";
  };
  const save = (analytics, marketing) => {
    current = { essential: true, analytics: Boolean(analytics), marketing: Boolean(marketing), version: VERSION, saved_at: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch {}
    applyConsent();
    window.AvodahAnalytics?.track("cookie_preferences_saved", { workflow: "cookie_preferences", status: "saved", analytics_enabled: current.analytics, marketing_enabled: current.marketing });
    close();
  };
  const markup = `
    <section class="cookie-banner" data-cookie-banner aria-label="Cookie preferences" hidden>
      <div><strong>Website preferences</strong><p>Essential storage supports forms and booking. Optional analytics helps measure non-personal website activity. Marketing tracking remains disabled unless approved and selected.</p></div>
      <div class="cookie-actions"><button type="button" class="button button-secondary" data-cookie-reject>Reject optional</button><button type="button" class="button button-secondary" data-cookie-settings>Choose preferences</button><button type="button" class="button button-primary" data-cookie-accept-all>Accept all</button></div>
    </section>
    <div class="cookie-modal-backdrop" data-cookie-modal hidden>
      <section class="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-dialog-title">
        <h2 id="cookie-dialog-title">Cookie preferences</h2>
        <p>Essential storage is always active. Optional choices can be changed later.</p>
        <label><input type="checkbox" checked disabled> <span><strong>Essential</strong><br>Needed for requested form, booking, security, and preference functions.</span></label>
        <label><input type="checkbox" data-cookie-analytics> <span><strong>Analytics</strong><br>Allows non-personal GA4 events and aggregate website measurement.</span></label>
        <label><input type="checkbox" data-cookie-marketing disabled> <span><strong>Marketing</strong><br>Approval-dependent. Meta Pixel remains disabled until final tracking approval.</span></label>
        <div class="cookie-actions"><button type="button" class="button button-secondary" data-cookie-close>Cancel</button><button type="button" class="button button-primary" data-cookie-save>Accept selected</button></div>
      </section>
    </div>`;
  let lastFocus = null;
  const modal = () => document.querySelector("[data-cookie-modal]");
  const close = () => {
    const dialog = modal(); if (!dialog) return;
    dialog.hidden = true; document.body.classList.remove("has-cookie-modal");
    lastFocus?.focus?.();
    const banner = document.querySelector("[data-cookie-banner]"); if (banner) banner.hidden = true;
  };
  const open = () => {
    const dialog = modal(); if (!dialog) return;
    lastFocus = document.activeElement;
    dialog.hidden = false; document.body.classList.add("has-cookie-modal");
    dialog.querySelector("[data-cookie-analytics]").checked = current.analytics;
    dialog.querySelector("[data-cookie-marketing]").checked = current.marketing;
    dialog.querySelector("button")?.focus();
  };
  const setup = () => {
    if (!document.querySelector("[data-cookie-banner]")) document.body.insertAdjacentHTML("beforeend", markup);
    const banner = document.querySelector("[data-cookie-banner]");
    if (!current.saved_at) banner.hidden = false;
    document.querySelectorAll("[data-cookie-settings], [data-cookie-reopen]").forEach((button) => button.addEventListener("click", open));
    document.querySelector("[data-cookie-accept-all]")?.addEventListener("click", () => save(true, false));
    document.querySelector("[data-cookie-reject]")?.addEventListener("click", () => save(false, false));
    document.querySelector("[data-cookie-save]")?.addEventListener("click", () => save(document.querySelector("[data-cookie-analytics]").checked, false));
    document.querySelector("[data-cookie-close]")?.addEventListener("click", close);
    modal()?.addEventListener("click", (event) => { if (event.target === modal()) close(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal()?.hidden) close();
      if (event.key === "Tab" && !modal()?.hidden) {
        const focusable = [...modal().querySelectorAll('button:not([disabled]), input:not([disabled])')];
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    applyConsent();
  };
  window.AvodahCookiePreferences = { get: () => ({ ...current }), open, save };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", setup) : setup();
})();
