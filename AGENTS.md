# AGENTS.md

## Repository Overview

**Avodah Wealth Advisory Website** — A static Netlify-deployed website providing financial guidance, insurance assistance, loan preparation, and travel services for individuals, families, OFWs, seafarers, and business owners in the Philippines.

### Stack
- **Languages:** HTML (63.9%), CSS (25.5%), JavaScript (10.6%)
- **Deployment:** Netlify (static hosting)
- **Backend Integration:** Google Apps Script for booking, lead management, and calendar synchronization
- **Notable Libraries/Services:** Google Tag Manager (GA4), Google Calendar API, Netlify Forms, Google Meet

## How It's Organized

```
root/
  index.html              Main homepage with hero, services, FAQ, consultation form
  *.html                  Service detail pages (20+ pages for specific offerings)
  contact.html            Contact form page
  about.html              About Avodah page
  services.html           Services overview
  free-checklists.html    Planning guide checklist page
  
  styles.css              Main stylesheet (~156KB)
  avodah-visibility-final.css   Additional visibility/accessibility stylesheet
  script.js               Client-side logic: forms, GA4, lead tracking, menu, FAQs
  booking.js / booking.css         Appointment booking interface
  manage-booking.js / manage-booking.css  Manage existing bookings
  needs-check.js / needs-check.css  Self-assessment questionnaire
  
  Assets/
    avodah-logo*.png      Logo and brand assets
    avodah-hero.webp      Hero image (optimized format)
    partner-*.png         Partner/provider logos (9+ partners)
    og-image.jpg          Open Graph preview image
  
  integrations/
    google-apps-script/   Server-side webhook backend
      Code.gs             Apps Script webhook processor
      README.md           Integration setup instructions
  
  netlify/                Netlify configuration directory
  netlify.toml            Build, redirects, headers, CSP, caching rules
  robots.txt              Search engine directives
  sitemap.xml             XML sitemap
  
  Documentation/
    README.md             Setup and deployment guide
    Multiple validation & phase notes (development artifacts)
```

**How it fits together:** The site flows through three main channels. **First**, visitor lands on homepage with GA4 page-view tracking; attribution params are captured and stored in sessionStorage. **Second**, visitors navigate service pages, take the needs-check questionnaire (needs-check.html), or fill the contact form (index.html / contact.html). Forms submit to Netlify Forms + custom webhook (script.js handles validation, lead ID generation, GA4 event tracking). **Third**, after form submission to the webhook endpoint, the Apps Script (`integrations/google-apps-script/Code.gs`) appends the lead to a Google Sheet (Intake Submissions), and if booking is requested, creates a Google Calendar event with Meet link and updates lead status. The netlify.toml enforces security headers (CSP, X-Frame-Options), URL rewrites for clean links, and cache headers for assets.

## How to Run It

### Local Development
```bash
# Clone the repo
git clone https://github.com/Jpelotea/avodahwealthadvisory.git
cd avodahwealthadvisory

# Serve locally (using any local server)
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js (http-server)
npx http-server

# Option 3: VS Code Live Server extension
# Right-click index.html > "Open with Live Server"

# Visit: http://localhost:8000 or http://localhost:3000 (depending on server)
```

### Deployment to Netlify
```bash
# 1. Push repo to GitHub
git push origin main

# 2. Connect repo to Netlify:
#    - Go to netlify.com > New site from Git
#    - Select GitHub > avodahwealthadvisory
#    - Build settings: Leave blank (static site, no build command needed)
#    - Publish directory: . (root)

# 3. Set environment variables in Netlify:
#    WEBHOOK_SECRET = [generate a secure secret for Apps Script]
#    GOOGLE_SHEETS_WEBHOOK_URL = [URL of deployed Apps Script]

# 4. Configure Forms:
#    - Netlify automatically detects netlify.toml configuration
#    - Forms post to "/" with data-netlify="true" attribute

# 5. Trigger webhook to Google Apps Script (Code.gs):
#    - From script.js, consultation form submits to Netlify Forms
#    - Netlify webhooks trigger Google Apps Script doPost()
#    - Script appends lead to "Intake Submissions" sheet + creates calendar event
```

### Webhook Integration (Apps Script)
```bash
# Deploy Apps Script manually:
# 1. Open existing Google Apps Script project (GOOGLE_SHEETS_WEBHOOK_URL reference)
# 2. Replace Code.gs with current integrations/google-apps-script/Code.gs
# 3. Update appsscript.json manifest in Project Settings
# 4. Deploy > Manage deployments > Edit > New version
# 5. Keep existing web-app access + Execute as "Me"
# 6. Authorize requested Sheets, Calendar, external-request permissions
# 7. Keep the deployment URL (no Netlify change needed)

# Configuration:
# - Spreadsheet ID: 1n1N3p8-xqWY6OHuEvlsWvTgWyRDVAOYULQgUdc0D3yU (hardcoded in Code.gs)
# - Sheets required: "Intake Submissions", "Calendar Log", "Targets & Settings"
# - Calendar ID: avodahwealthadvisory@gmail.com (shares booking slots)
```

### Key Environment Variables
- `WEBHOOK_SECRET` — Shared secret for Apps Script webhook validation
- `GOOGLE_SHEETS_WEBHOOK_URL` — Deployed Apps Script endpoint URL (stored in netlify.toml)
- Domain URLs — Update canonical URLs, og:url, Twitter URLs, sitemap URLs if domain changes

### Required Assets
- All `.png` and `.webp` image files must be present at root
- `styles.css` and `avodah-visibility-final.css` must be referenced in index.html `<head>`
- `netlify.toml` must NOT be removed (contains CSP, cache rules, redirects)
- Netlify Forms attributes in `index.html` and `contact.html` must remain (data-netlify, form-name)
- GA4 script (Google Tag Manager) must stay in place for analytics

## Try Asking

1. **How do I customize the booking availability and appointment duration?** — Edit `integrations/google-apps-script/Code.gs` and `getBookingConfig_()` function, or configure the "Targets & Settings" sheet in the linked Google Sheet (Calendar ID, Owner name, Start/End hours, Appointment Minutes, Buffer Minutes, etc.).

2. **Where is the form submission data stored and how is it processed?** — Contact form submissions go to Netlify Forms (infrastructure managed by Netlify) and trigger a webhook to the Google Apps Script endpoint. The script appends rows to the "Intake Submissions" sheet in a Google Sheet (SPREADSHEET_ID = 1n1N3p8...). On booking, a second webhook creates a Google Calendar event and logs it to the "Calendar Log" sheet.

3. **How are the needs-check questionnaire and booking.js scripts handling user interactions and dynamic availability?** — `needs-check.js` manages a multi-step form and captures user goals; it submits to the webhook (`booking.js` manages slots fetched from the Apps Script availability endpoint). `booking.js` parses the JSON availability response (days, slots, times) and renders a date/time picker; on selection, it POSTs to the Apps Script with the lead_id and requested slot, which validates availability, creates the calendar event, and returns the Google Meet link.
