(() => {
  "use strict";

  const STORAGE_KEY = "avodahCookiePreferences";
  const CONSENT_VERSION = "cookie-consent-v2-2026-07-24";
  const GA_MEASUREMENT_ID = "G-HV9X54P7NT";
  let analyticsLoaded = false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });

  const readPreferences = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || saved.version !== CONSENT_VERSION) {
        return { essential: true, analytics: false, marketing: false, version: CONSENT_VERSION, saved_at: "" };
      }
      return {
        essential: true,
        analytics: Boolean(saved.analytics),
        marketing: false,
        version: CONSENT_VERSION,
        saved_at: String(saved.saved_at || ""),
      };
    } catch {
      return { essential: true, analytics: false, marketing: false, version: CONSENT_VERSION, saved_at: "" };
    }
  };

  const removeAnalyticsCookies = () => {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0]?.trim();
      if (!name || (!name.startsWith("_ga") && name !== "_gid" && name !== "_gat")) return;
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      const domain = location.hostname.split(".").slice(-2).join(".");
      if (domain.includes(".")) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}; SameSite=Lax`;
      }
    });
  };

  const loadAnalytics = () => {
    if (analyticsLoaded || document.querySelector('script[data-avodah-ga="true"]')) return;
    analyticsLoaded = true;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    script.dataset.avodahGa = "true";
    script.addEventListener("load", () => {
      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID, {
        send_page_view: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }, { once: true });
    document.head.appendChild(script);
  };

  const apply = (preferences = readPreferences()) => {
    const analytics = Boolean(preferences.analytics);
    const marketing = false;
    window.gtag("consent", "update", {
      analytics_storage: analytics ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    document.documentElement.dataset.analyticsConsent = analytics ? "granted" : "denied";
    document.documentElement.dataset.marketingConsent = marketing ? "granted" : "denied";
    if (analytics) loadAnalytics();
    else removeAnalyticsCookies();
    return { ...preferences, analytics, marketing };
  };

  window.AvodahConsent = {
    storageKey: STORAGE_KEY,
    version: CONSENT_VERSION,
    get: readPreferences,
    apply,
    loadAnalytics,
  };

  apply();
  window.addEventListener("avodah:consent-changed", (event) => apply(event.detail));
})();
