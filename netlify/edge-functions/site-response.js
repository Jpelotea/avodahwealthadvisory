import { parse, serialize } from "parse5";

const CLEAN_ROUTES = {
  "/about/": "/about.html",
  "/services/": "/services.html",
  "/consultation/": "/needs-check.html",
  "/consultation/confirmation/": "/consultation-confirmation.html",
  "/consultation/booking-confirmation/": "/booking-confirmation.html",
  "/client-support/": "/client-support.html",
  "/client-support/confirmation/": "/support-confirmation.html",
  "/careers/": "/join-our-team.html",
  "/careers/opportunities/": "/career-opportunities.html",
  "/careers/process/": "/recruitment-process.html",
  "/careers/apply/": "/recruitment-application.html",
  "/careers/confirmation/": "/recruitment-confirmation.html",
  "/contact/": "/general-inquiry.html",
  "/contact/confirmation/": "/contact-confirmation.html",
  "/privacy/": "/privacy-policy.html",
  "/terms/": "/terms.html",
  "/disclaimer/": "/disclaimer.html",
  "/cookies/": "/cookie-policy.html",
};

const LEGACY_REDIRECTS = {
  "/about.html": "/about/",
  "/services.html": "/services/",
  "/needs-check": "/consultation/",
  "/needs-check.html": "/consultation/",
  "/consultation-confirmation.html": "/consultation/confirmation/",
  "/booking-confirmation.html": "/consultation/booking-confirmation/",
  "/client-support.html": "/client-support/",
  "/support-confirmation.html": "/client-support/confirmation/",
  "/join-our-team.html": "/careers/",
  "/career-opportunities.html": "/careers/opportunities/",
  "/recruitment-process.html": "/careers/process/",
  "/recruitment-application.html": "/careers/apply/",
  "/recruitment-confirmation.html": "/careers/confirmation/",
  "/general-inquiry.html": "/contact/",
  "/contact.html": "/contact/",
  "/contact-confirmation.html": "/contact/confirmation/",
  "/privacy-policy.html": "/privacy/",
  "/terms.html": "/terms/",
  "/disclaimer.html": "/disclaimer/",
  "/cookie-policy.html": "/cookies/",
};

const RELEASE_CANDIDATE_REVISION = "m8-deploy-recovery-v1";
const DEPLOY_COMMIT_REF = "__NETLIFY_COMMIT_REF__";
const GA_MEASUREMENT_ID = "G-HV9X54P7NT";
const productionCanonical = (path) => `https://avodahwealthadvisory.netlify.app${path}`;

const attributeValue = (node, name) => node.attrs?.find((item) => item.name === name)?.value || "";
const scriptText = (node) => (node.childNodes || [])
  .filter((child) => child.nodeName === "#text")
  .map((child) => child.value || "")
  .join("");

const stripLegacyAnalytics = (html) => {
  const document = parse(html);
  const visit = (node) => {
    if (!node?.childNodes) return;
    node.childNodes = node.childNodes.filter((child) => {
      if (child.tagName !== "script") return true;
      const source = attributeValue(child, "src");
      const inline = scriptText(child);
      const legacyLoader = source.includes("googletagmanager.com/gtag/js");
      const legacyConfig = inline.includes(GA_MEASUREMENT_ID) && inline.includes("gtag(");
      return !legacyLoader && !legacyConfig;
    });
    node.childNodes.forEach(visit);
  };
  visit(document);
  return serialize(document);
};

const normalizeRootDocumentUrls = (html) =>
  html.replace(/\b(href|src|action)=(['"])([^'"]+)\2/gi, (match, attribute, quote, value) => {
    const trimmed = value.trim();
    if (!trimmed || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#|\?)/i.test(trimmed)) return match;
    return `${attribute}=${quote}/${trimmed}${quote}`;
  });

export default async (request, context) => {
  const requestUrl = new URL(request.url);
  const pathname = requestUrl.pathname;
  const deployContext = Netlify.env.get("CONTEXT") || "unknown";

  if (pathname === "/rc-revision.json") {
    return Response.json(
      { revision: DEPLOY_COMMIT_REF, deployContext },
      {
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      },
    );
  }

  const redirectTarget = LEGACY_REDIRECTS[pathname];
  if (redirectTarget) {
    const target = new URL(redirectTarget, request.url);
    target.search = requestUrl.search;
    return Response.redirect(target, 301);
  }

  const sourcePath = CLEAN_ROUTES[pathname];
  const response = await context.next();

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let html = stripLegacyAnalytics(await response.text());
  const nonProduction = deployContext === "branch-deploy" || deployContext === "deploy-preview";

  if (sourcePath) {
    html = normalizeRootDocumentUrls(html);
    const canonical = productionCanonical(pathname);
    html = html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, `<link rel="canonical" href="${canonical}">`);
    html = html.replace(/<meta\b[^>]*property=["']og:url["'][^>]*>/gi, `<meta property="og:url" content="${canonical}">`);
  }

  const additions = [];
  if (!html.includes("/workflow.css")) additions.push('<link rel="stylesheet" href="/workflow.css?v=20260724-m4">');
  if (!html.includes("/milestone-7-fixes.css")) additions.push('<link rel="stylesheet" href="/milestone-7-fixes.css?v=20260725-m7b">');
  if (!html.includes("/consent-bootstrap.js")) additions.push('<script src="/consent-bootstrap.js?v=20260724-m4"></script>');
  if (!html.includes("/site-shell.js")) additions.push('<script src="/site-shell.js?v=20260724-m4" defer></script>');
  if (!html.includes("/analytics.js")) additions.push('<script src="/analytics.js?v=20260724-m4" defer></script>');
  if (!html.includes("/cookie-preferences.js")) additions.push('<script src="/cookie-preferences.js?v=20260724-m4" defer></script>');
  if (pathname === "/consultation/" && !html.includes("/needs-check-consent.js")) additions.push('<script src="/needs-check-consent.js?v=20260725-m7" defer></script>');
  if (pathname === "/system-error.html" && !html.includes("/system-error.js")) additions.push('<script src="/system-error.js?v=20260725-m7" defer></script>');

  if (nonProduction) {
    html = html.replace(/<meta\b[^>]*name=["']robots["'][^>]*>/gi, "");
    additions.unshift('<meta name="robots" content="noindex,nofollow,noarchive">');
  }

  html = html.replace(/<\/head>/i, `${additions.join("\n")}\n</head>`);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  if (nonProduction) headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  headers.set("x-avodah-deploy-context", deployContext);
  headers.set("x-avodah-rc-revision", RELEASE_CANDIDATE_REVISION);

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const config = {
  path: "/*",
  excludedPath: ["/api/*", "/.netlify/*"],
  method: "GET",
  onError: "bypass",
};
