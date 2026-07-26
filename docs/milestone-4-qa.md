# Milestone 4 QA evidence

Assessment date: 2026-07-24  
Branch: `agent/blueprint-foundation`  
Pull request: #8 (draft)

## Verification categories

- **Deployed:** confirmed by the Netlify Deploy Preview/build metadata or detected platform resources.
- **Source-verified:** checked against committed HTML, CSS, JavaScript, Edge Function, Function, form, sitemap, or documentation source.
- **Mocked/contract-level:** checked using preview-isolated responses or source response contracts without calling the Operations Hub TEST environment.
- **Manual pending:** requires a human browser/device or separately authorized integration environment.

## Website form matrix

| Form | Detection | Honeypot | Consent | Confirmation | Reference | Hub TEST submission | Result |
|---|---|---|---|---|---|---|---|
| `consultation` | Netlify static definition | Yes | Required processing + optional unchecked marketing, versioned | `/consultation/confirmation/` | UUID | Prohibited during maintenance; production sync contract preserved only | Source-verified; latest deploy detection to confirm |
| `client-needs-check` | Netlify static definition | Yes | Required processing only when consultation requested + optional unchecked marketing, versioned | In-page completion and optional isolated booking | UUID | Prohibited during maintenance; legacy 24-column compatibility mirror retained | Source-verified; latest deploy detection to confirm |
| `consultation-recovery` | Netlify static definition | Yes | Not a public consent form; records failure metadata only | Existing workflow status | Lead ID | No Hub retry or notification claim | Deployed previously; latest detection to confirm |
| `client-support` | Netlify | Yes | Privacy acknowledgment and accuracy confirmation | `/client-support/confirmation/` | `AWA-SUP-*` | None | Deployed/source-verified |
| `recruitment-application` | Netlify | Yes | Privacy, recruitment-processing consent, accuracy declaration | `/careers/confirmation/` | `AWA-REC-*` | None; no resume upload | Deployed/source-verified |
| `general-inquiry` | Netlify | Yes | Privacy acknowledgment and accuracy confirmation | `/contact/confirmation/` | `AWA-INQ-*` | None | Deployed/source-verified |

No real or synthetic record was submitted to the Operations Hub TEST environment.

## Consent and analytics matrix

| State | Expected behavior | Verification |
|---|---|---|
| First visit, no current-version preference | Analytics and marketing denied; banner shown; essential storage available | Source-verified |
| Analytics accepted | GA script dynamically loads once; approved non-PII events may be sent | Source-verified; browser network confirmation manual pending |
| Optional cookies rejected | GA not dynamically loaded; Meta Pixel remains absent; forms/navigation/session confirmation continue | Source-verified; browser network confirmation manual pending |
| Returning visitor, current version | Preference read before optional analytics load | Source-verified |
| Outdated consent version | Treated as no current consent; optional categories denied and banner shown | Source-verified |
| Preference changed from accepted to rejected | Consent updated to denied and first-party GA cookies removed where browser controls permit | Source-verified; browser cookie confirmation manual pending |
| Legacy page calls `gtag("event")` without consent | Event call is dropped before entering the data layer | Source-verified |
| Marketing accepted | UI remains disabled and consent remains denied because Meta Pixel is not approved | Source-verified |

Consent version remains `cookie-consent-v2-2026-07-24`.

## Analytics privacy checks

The centralized analytics module permits only approved event names and bounded parameters. It rejects parameter keys associated with names, email, phone/mobile, Messenger, messages, policies, application references, resumes, appointment notes, lead IDs, booking IDs, and references.

Permitted event categories remain workflow, status, page path, campaign source/medium/name, meeting method, support category, career path, inquiry category, consent booleans, retryability, and duplicate status. Meta Pixel is not loaded.

## Route and indexing checks

- Clean public routes map to existing static source files through the Edge Function.
- Legacy `.html` workflow/legal paths redirect to one clean canonical route.
- Existing API paths are excluded from the Edge Function and unchanged.
- Deploy previews and branch deploys receive `noindex,nofollow,noarchive` metadata and `X-Robots-Tag`.
- Production sitemap contains only the production Netlify domain.
- Confirmation, error, recovery, form-processing, API, preview, and duplicate legacy paths are excluded from the sitemap.
- Query strings are retained through compatibility redirects; no form payload is placed in a confirmation URL.

## Accessibility and responsive source checks

Confirmed in source:

- Skip links and primary `main` targets.
- Explicit form labels and inline errors.
- Live status regions on workflow forms.
- Keyboard-operable mobile menu with Escape close.
- Current-page `aria-current` in the global navigation.
- Cookie dialog role, modal semantics, focus containment, Escape close, and focus restoration.
- Visible focus outlines.
- Minimum touch-size foundations.
- Fluid fields and one-column mobile layouts.
- Reduced-motion override.
- Long references use wrapping.
- No fixed form width requiring horizontal scrolling.

Manual verification still required before production approval:

- Chromium, Firefox, and WebKit/Safari-compatible rendering.
- Keyboard traversal on every route.
- 200% browser zoom.
- 1440, 1280, 768, 390, and 320 pixel viewport captures.
- Color contrast sampling against rendered fonts/backgrounds.
- Back/forward behavior with session confirmation state.
- Console and network panel review in each consent state.

## Screenshot index

Available platform evidence:

- Netlify automated homepage screenshot for each successful Deploy Preview, linked from the Netlify deploy record.
- Netlify mobile QR preview link in Pull Request #8.

The requested full route-by-viewport screenshot matrix cannot be generated by the connected execution environment because it has no interactive browser screenshot capability. It remains a release-blocking manual QA item. No screenshot was fabricated or represented as tested.

Required manual capture list:

1. Homepage
2. Consultation
3. Consultation confirmation
4. Booking confirmation
5. Client Support
6. Support confirmation
7. Join Our Team
8. Career Opportunities
9. Recruitment Process
10. Recruitment Application
11. Recruitment confirmation
12. General Inquiry
13. Contact confirmation
14. Cookie Policy
15. Privacy Policy
16. 404
17. Temporary system error

Capture each at approximately 1440, 1280, 768, 390, and 320 pixels, prioritizing homepage and all form routes at every width.

## Performance and technical checks

Deployed/build evidence to record from the latest successful preview:

- Build state and deploy ID.
- Functions and Edge Functions detected.
- Forms detected.
- Redirect/header processing.
- Secret scan.
- Automated deploy screenshot.

Source review findings:

- GA bootstrap is dynamically loaded once after consent.
- Legacy static GA bootstrap is removed from served HTML by the Edge Function.
- Static assets retain existing Netlify cache policies.
- Clean routes use one Edge rewrite without a public redirect chain.
- Legacy routes use one 301 redirect to the canonical route.
- Preview booking/availability responses are isolated from live integrations.

Not available in the connected toolset:

- Lighthouse performance, accessibility, SEO, or best-practice scores.
- Core Web Vitals field data.
- Browser performance traces.

These must be collected manually or through an approved CI/browser QA service before production release.

## Operations Hub verification boundary

Only static repository source and committed diagnostic text were inspected. No Apps Script API call, webhook call, workflow dispatch, manual runner, TEST form submission, Calendar event, Meet request, Script Property read/write, or deployment action was performed.

Cross-system behaviors are classified as source-observed or contract-level only. End-to-end compatibility remains unverified and on hold.
