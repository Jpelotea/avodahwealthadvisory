export default async (request, context) => {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let html = await response.text();
  const deployContext = Netlify.env.get("CONTEXT") || "";
  const nonProduction = deployContext === "branch-deploy" || deployContext === "deploy-preview";

  html = html
    .replace(/<script\b[^>]*src=["']https:\/\/www\.googletagmanager\.com\/gtag\/js[^"']*["'][^>]*><\/script>/gi, "")
    .replace(/<script>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\][\s\S]*?gtag\(['"]config['"][\s\S]*?<\/script>/gi, "");

  const additions = [];
  if (!html.includes("/workflow.css")) additions.push('<link rel="stylesheet" href="/workflow.css?v=20260724-m3">');
  if (!html.includes("/consent-bootstrap.js")) additions.push('<script src="/consent-bootstrap.js?v=20260724-m3"></script>');
  if (!html.includes("/site-shell.js")) additions.push('<script src="/site-shell.js?v=20260724-m3" defer></script>');
  if (!html.includes("/analytics.js")) additions.push('<script src="/analytics.js?v=20260724-m3" defer></script>');
  if (!html.includes("/cookie-preferences.js")) additions.push('<script src="/cookie-preferences.js?v=20260724-m3" defer></script>');

  if (nonProduction) {
    html = html.replace(/<meta\b[^>]*name=["']robots["'][^>]*>/gi, "");
    additions.unshift('<meta name="robots" content="noindex,nofollow,noarchive">');
  }

  html = html.replace(/<\/head>/i, `${additions.join("\n")}\n</head>`);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  if (nonProduction) headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  headers.set("x-avodah-deploy-context", deployContext || "unknown");

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
