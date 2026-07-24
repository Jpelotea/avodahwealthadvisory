(() => {
  "use strict";

  const STORAGE_KEY = window.AvodahConsent?.storageKey || "avodahCookiePreferences";
  const VERSION = window.AvodahConsent?.version || "cookie-consent-v2-2026-07-24";
  const defaults = { essential: true, analytics: false, marketing: false, version: VERSION, saved_at: "" };

  const read = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || saved.version !== VERSION) return { ...defaults };
      return { ...defaults, analytics: Boolean(saved.analytics), marketing: false, saved_at: String(saved.saved_at || "") };
    } catch {
      return { ...defaults };
    }
  };

  let current = read();
  let lastFocus = null;

  const markup = `
    <section class="cookie-banner" data-cookie-banner aria-label="Cookie preferences" hidden>
      <div><strong>Website preferences</strong><p>Essential storage supports forms and booking. Optional analytics is loaded only after permission. Marketing tracking remains disabled.</p></div>
      <div class="cookie-actions"><button type="button" class="button button-secondary" data-cookie-reject>Reject optional</button><button type="button" class="button button-secondary" data-cookie-settings>Choose preferences</button><button type="button" class="button button-primary" data-cookie-accept-all>Accept analytics</button></div>
    </section>
    <div class="cookie-modal-backdrop" data-cookie-modal hidden>
      <section class="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-dialog-title" aria-describedby="cookie-dialog-description">
        <h2 id="cookie-dialog-title">Cookie preferences</h2><p id="cookie-dialog-description">Essential storage is always active. Optional choices can be changed later.</p>
        <label><input type="checkbox" checked disabled> <span><strong>Essential</strong><br>Needed for requested form, booking, security, confirmation, and preference functions.</span></label>
        <label><input type="checkbox" data-cookie-analytics> <span><strong>Analytics</strong><br>Loads Google Analytics 4 for non-personal, aggregate website measurement.</span></label>
        <label><input type="checkbox" data-cookie-marketing disabled> <span><strong>Marketing</strong><br>Approval-dependent. Meta Pixel is not loaded by this website.</span></label>
        <div class="cookie-actions"><button type="button" class="button button-secondary" data-cookie-close>Cancel</button><button type="button" class="button button-primary" data-cookie-save>Accept selected</button></div>
      </section>
    </div>`;

  const modal = () => document.querySelector("[data-cookie-modal]");
  const banner = () => document.querySelector("[data-cookie-banner]");

  const close = () => {
    const element = modal();
    if (!element) return;
    element.hidden = true;
    document.body.classList.remove("has-cookie-modal");
    lastFocus?.focus?.();
  };

  const open = () => {
    const element = modal();
    if (!element) return;
    lastFocus = document.activeElement;
    element.hidden = false;
    document.body.classList.add("has-cookie-modal");
    element.querySelector("[data-cookie-analytics]").checked = current.analytics;
    element.querySelector("[data-cookie-marketing]").checked = false;
    element.querySelector("button")?.focus();
  };

  const save = (analytics) => {
    current = { essential: true, analytics: Boolean(analytics), marketing: false, version: VERSION, saved_at: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch {}
    window.dispatchEvent(new CustomEvent("avodah:consent-changed", { detail: { ...current } }));
    window.AvodahAnalytics?.track("cookie_preferences_saved", { workflow: "cookie_preferences", status: "saved", analytics_enabled: current.analytics, marketing_enabled: false });
    if (banner()) banner().hidden = true;
    close();
  };

  const bindReopenButtons = () => {
    document.querySelectorAll("[data-cookie-settings], [data-cookie-reopen]").forEach((button) => {
      if (button.dataset.cookieBound === "true") return;
      button.dataset.cookieBound = "true";
      button.addEventListener("click", open);
    });
  };

  const setup = () => {
    if (!banner()) document.body.insertAdjacentHTML("beforeend", markup);
    if (!current.saved_at && banner()) banner().hidden = false;
    bindReopenButtons();
    document.addEventListener("avodah:shell-ready", bindReopenButtons);
    document.querySelector("[data-cookie-accept-all]")?.addEventListener("click", () => save(true));
    document.querySelector("[data-cookie-reject]")?.addEventListener("click", () => save(false));
    document.querySelector("[data-cookie-save]")?.addEventListener("click", () => save(Boolean(document.querySelector("[data-cookie-analytics]")?.checked)));
    document.querySelector("[data-cookie-close]")?.addEventListener("click", close);
    modal()?.addEventListener("click", (event) => { if (event.target === modal()) close(); });
    document.addEventListener("keydown", (event) => {
      const element = modal();
      if (!element || element.hidden) return;
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...element.querySelectorAll('button:not([disabled]), input:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  };

  window.AvodahCookiePreferences = { get: () => ({ ...current }), open, save };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", setup, { once: true }) : setup();
})();
