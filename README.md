# Avodah Wealth Advisory Website

Static Netlify-ready website for Avodah Wealth Advisory.

## What this package includes

- Main website pages and service detail pages
- Netlify Forms contact form
- GA4 page view and generate_lead tracking
- Sitemap and robots.txt
- Netlify security headers and redirects in netlify.toml
- Valid local image assets for logos, partner logos, hero image, and Open Graph preview

## Deployment

Upload the contents of this folder to Netlify. Keep all files in the root of the deployed site unless a custom build process is added later.

## Important notes

- Do not remove netlify.toml. It contains security headers, cache rules, and redirects.
- Do not remove the form attributes in index.html and contact.html. They are needed for Netlify Forms.
- Do not remove the GA4 script or the lead tracking logic in script.js.
- The site is intentionally free from AI assistant features.
- If the domain changes, update canonical URLs, Open Graph URLs, Twitter image URLs, sitemap URLs, robots.txt sitemap URL, and JSON-LD URLs.
