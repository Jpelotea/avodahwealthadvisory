(() => {
  "use strict";

  const normalizePath = (value) => {
    const url = new URL(value, location.origin);
    const path = url.pathname.replace(/index\.html$/, "").replace(/\.html$/, "").replace(/\/$/, "") || "/";
    return path;
  };

  const navMarkup = `
    <a href="/">Home</a>
    <a href="/services/">Services</a>
    <a href="/client-support/">Client Support</a>
    <a href="/careers/">Join Our Team</a>
    <a href="/contact/">Contact</a>
    <a class="button button-primary button-small" href="/consultation/">Start Consultation</a>`;

  const headerMarkup = `
    <header aria-label="Primary" class="site-header" data-global-header>
      <a aria-label="Avodah Wealth Advisory home" class="brand" href="/">
        <span class="brand-mark"><img alt="" height="32" src="/avodah-logo-mark.png" width="28"></span>
        <span>Avodah Wealth Advisory</span>
      </a>
      <button aria-controls="primary-nav" aria-expanded="false" aria-label="Open menu" class="menu-toggle" type="button">
        <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
      </button>
      <nav aria-label="Main navigation" class="nav" id="primary-nav">${navMarkup}</nav>
    </header>`;

  const footerMarkup = `
    <footer class="avodah-footer global-footer" data-global-footer>
      <div class="footer-container">
        <div class="footer-grid-launch">
          <section><h2>Avodah Wealth Advisory</h2><p>SMART solutions and practical next steps for life’s important decisions.</p><p><a href="tel:+639171867419">+63 917 186 7419</a><br><a href="mailto:avodahwealthadvisory@gmail.com">avodahwealthadvisory@gmail.com</a></p></section>
          <section><h3>Explore</h3><a href="/about/">About Avodah</a><a href="/services/">Services</a><a href="/free-checklists.html">Financial Education</a></section>
          <section><h3>Get Help</h3><a href="/consultation/">Start a Consultation</a><a href="/client-support/">Client Support</a><a href="/contact/">General Inquiry</a></section>
          <section><h3>Careers</h3><a href="/careers/">Join Our Team</a><a href="/careers/opportunities/">Career Opportunities</a><a href="/careers/process/">Recruitment Process</a><a href="/careers/apply/">Apply</a></section>
          <section><h3>Legal</h3><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms of Use</a><a href="/disclaimer/">Disclaimer</a><a href="/cookies/">Cookie Policy</a><button type="button" class="footer-preference-button" data-cookie-reopen>Cookie Preferences</button></section>
        </div>
        <div class="footer-bottom-row"><div>&copy; 2026 Avodah Wealth Advisory. All rights reserved.</div><div><a href="https://www.facebook.com/avodahwealthadvisory/" target="_blank" rel="noopener">Facebook</a> · <a href="https://m.me/1054966131030483" target="_blank" rel="noopener">Messenger</a></div></div>
      </div>
    </footer>`;

  const ensureSkipLink = () => {
    if (!document.querySelector('.skip-link[href="#main"]')) document.body.insertAdjacentHTML("afterbegin", '<a class="skip-link" href="#main">Skip to main content</a>');
  };

  const ensureHeader = () => {
    let header = document.querySelector(".site-header");
    if (!header) {
      const skip = document.querySelector(".skip-link");
      if (skip) skip.insertAdjacentHTML("afterend", headerMarkup);
      else document.body.insertAdjacentHTML("afterbegin", headerMarkup);
      header = document.querySelector(".site-header");
    } else {
      header.dataset.globalHeader = "true";
      const nav = header.querySelector(".nav");
      if (nav) nav.innerHTML = navMarkup;
    }
    return header;
  };

  const ensureFooter = () => {
    const existing = document.querySelector(".avodah-footer, footer");
    if (existing) existing.outerHTML = footerMarkup;
    else document.body.insertAdjacentHTML("beforeend", footerMarkup);
  };

  const markCurrentPage = (header) => {
    const current = normalizePath(location.pathname);
    header?.querySelectorAll("nav a[href]").forEach((link) => {
      const target = normalizePath(link.href);
      const active = target === current || (target !== "/" && current.startsWith(`${target}/`));
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };

  const bindMenu = (header) => {
    let toggle = header?.querySelector(".menu-toggle");
    const nav = header?.querySelector(".nav");
    if (!header || !toggle || !nav) return;

    const cleanToggle = toggle.cloneNode(true);
    toggle.replaceWith(cleanToggle);
    toggle = cleanToggle;

    const close = () => {
      header.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    };
    toggle.addEventListener("click", () => {
      const open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
    document.addEventListener("click", (event) => { if (header.classList.contains("is-open") && !header.contains(event.target)) close(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    addEventListener("resize", () => { if (matchMedia("(min-width: 901px)").matches) close(); });
  };

  const addPathways = () => {
    const path = normalizePath(location.pathname);
    if (path === "/" && !document.querySelector("[data-launch-pathways]")) {
      document.querySelector("main")?.insertAdjacentHTML("beforeend", `
        <section class="launch-pathways" data-launch-pathways aria-labelledby="launch-pathways-title">
          <div class="container"><p class="section-kicker">Choose the right next step</p><h2 id="launch-pathways-title">How may Avodah help?</h2><div class="launch-pathway-grid">
            <a href="/consultation/"><strong>Start a Consultation</strong><span>Share your concern and continue to scheduling.</span></a>
            <a href="/client-support/"><strong>Existing Client Support</strong><span>Route policy, application, payment, document, or adviser requests.</span></a>
            <a href="/careers/"><strong>Join Our Team</strong><span>Review opportunities, the recruitment process, and application steps.</span></a>
            <a href="/contact/"><strong>General Inquiry</strong><span>Contact Avodah about partnerships or other non-support questions.</span></a>
          </div></div>
        </section>`);
    }
    if (path === "/contact" && !document.querySelector("[data-contact-routing]")) {
      document.querySelector("main")?.insertAdjacentHTML("afterbegin", `
        <section class="contact-routing" data-contact-routing aria-label="Contact routes"><div class="container"><div class="launch-pathway-grid compact">
          <a href="/consultation/"><strong>Financial Consultation</strong><span>Start with your financial concern.</span></a>
          <a href="/client-support/"><strong>Client Support</strong><span>For existing policies, applications, payments, and documents.</span></a>
          <a href="/careers/apply/"><strong>Recruitment</strong><span>Apply through the structured recruitment form.</span></a>
          <a href="/contact/"><strong>General Inquiry</strong><span>For partnerships and other questions.</span></a>
        </div></div></section>`);
    }
  };

  const setup = () => {
    ensureSkipLink();
    const header = ensureHeader();
    ensureFooter();
    markCurrentPage(header);
    bindMenu(header);
    addPathways();
    document.dispatchEvent(new CustomEvent("avodah:shell-ready"));
  };

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", setup, { once: true }) : setup();
})();
