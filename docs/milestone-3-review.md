# Milestone 3 stakeholder review

Date: 2026-07-24  
Branch: `agent/blueprint-foundation`  
Production branch: unchanged

## Branch health

- Branch is based on the current production commit and remains ahead-only.
- Existing booking endpoint paths remain `/api/booking-slots` and `/api/book-consultation`.
- No literal webhook secret, API key, private key, or client record was intentionally added.
- Duplicate Milestone 2 commit messages represented sequential file-by-file work, not duplicate files. Milestone 3 uses distinct messages.
- Minified Milestone 2 shared files were retained where functional; the consent and global shell components were reformatted and corrected.

## Review pathways

- Consultation: `/needs-check` → `/consultation-confirmation.html` → synthetic preview booking.
- Client support: `/client-support.html` → `/support-confirmation.html`.
- Recruitment: `/join-our-team.html` → `/career-opportunities.html` → `/recruitment-process.html` → `/recruitment-application.html` → `/recruitment-confirmation.html`.
- General inquiry: `/general-inquiry.html` → `/contact-confirmation.html`.
- Privacy controls: `/cookie-policy.html` and the Cookie Preferences button in the shared footer.

## Consent behavior

- Essential form, navigation, confirmation, booking-session, and preference storage remains available.
- Google Analytics is not requested until the saved analytics preference is granted.
- Analytics denial updates Google consent state and attempts to remove existing first-party GA cookies.
- Marketing consent is fixed to denied and Meta Pixel is not loaded.
- Consent version: `cookie-consent-v2-2026-07-24`.

## Preview isolation

Branch and deploy-preview contexts use simulated availability and booking responses unless `PREVIEW_INTEGRATION_MODE=live` is deliberately configured. Simulation creates no Google Calendar event, Google Meet link, email, or Operations Hub record. All preview HTML receives `noindex,nofollow,noarchive` through an Edge Function and response header.

## Scheduling contract

The website sends a backward-compatible `scheduling` object. The current Google Apps Script source was not available through the connected repository, so it was not modified. A review-only patch is provided at `integrations/google-apps-script/scheduling-contract-patch.js`. Temporary defaults remain 30/30/30. The 45/15/15, four-hour notice, 30-day profile remains approval-dependent.

## Forms expected in preview

- Existing consultation forms
- Existing client-needs forms
- `consultation-recovery`
- `client-support`
- `recruitment-application`
- `general-inquiry`

All new forms use honeypots, required processing acknowledgments, workflow-specific confirmation state, and no resume upload.

## QA matrix

| Area | Result | Evidence/limitation |
|---|---|---|
| JavaScript syntax | Passed | Shared scripts and functions checked before commit |
| Endpoint compatibility | Passed | Existing public API paths retained |
| Preview indexing protection | Implemented | Edge response meta and X-Robots-Tag |
| Consent first visit | Implemented | Default denied; banner shown without stored current-version choice |
| Consent returning visit | Implemented | Current-version local preference evaluated before GA load |
| Marketing tracking | Disabled | No Meta Pixel loader |
| Keyboard cookie dialog | Implemented | Escape, focus wrap, focus restoration |
| Reduced motion | Implemented | Shared CSS media query |
| Responsive workflow forms | Static pass | One-column mobile layout and fluid controls |
| Live Calendar/Meet/email | Not exercised | Preview deliberately simulates integrations |
| Apps Script scheduling consumption | Not verified | Patch requires Apps Script owner review/deployment |
| Netlify form detection | Pending deploy inspection | Verify after preview build completes |
| Cross-browser screenshots | Pending preview URL | Capture after deploy is available |

## Known limitations and approvals

- Support owner and response-time language remains placeholder text.
- Resume storage/upload remains disabled.
- Compensation, allowance, guaranteed earning, classification, and provider-relationship claims remain unpublished.
- Meta Pixel and marketing tracking require compliance approval.
- The final scheduling profile requires business approval.
- An automated retry queue and administrator notification service are not present; recovery wording remains `Recovery record created`, `Manual follow-up required`, `Notification pending`, and `Integration retry not yet automated` as applicable.

## Production readiness checklist

1. Stakeholder content approval.
2. Compliance approval for privacy/cookie wording and optional tracking.
3. Apps Script patch review, deployment, and reauthorization if required.
4. Netlify preview form detection and synthetic submission cleanup.
5. Browser, mobile, zoom, console, network, and accessibility QA.
6. Production environment-variable review.
7. Final diff review and explicit merge authorization.

## Rollback

Production remains on `main`. Do not merge the development branch until approval. If a later production release is rejected, redeploy the previous known-good production commit or revert the merge commit; existing endpoint compatibility is retained.

## Recommended Milestone 4

Resolve preview findings, obtain content/compliance/scheduling approvals, deploy and reauthorize the Apps Script contract, perform controlled end-to-end staging tests with approved test accounts, and prepare an explicit production release candidate.
