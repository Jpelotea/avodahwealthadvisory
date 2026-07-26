# Milestone 4 website release-candidate package

Prepared: 2026-07-24  
Status: **Release candidate prepared; production approval not recommended yet**

## Website information

| Item | Value |
|---|---|
| Repository | `Jpelotea/avodahwealthadvisory` |
| Branch | `agent/blueprint-foundation` |
| Pull request | [#8 — draft](https://github.com/Jpelotea/avodahwealthadvisory/pull/8) |
| Runtime RC commit | `abb2c005aa0d44802a5bd8981720b411f1b69ac5` |
| Deploy Preview | <https://deploy-preview-8--avodahwealthadvisory.netlify.app> |
| Immutable runtime preview | <https://6a63879c1d9f7700088e2ad5--avodahwealthadvisory.netlify.app> |
| Netlify Deploy ID | `6a63879c1d9f7700088e2ad5` |
| Production baseline commit | `e9853d2d080f684dcb1e361856fe0a377224055e` |
| Production merge/deploy | Not performed |

Netlify runtime result:

- State: ready.
- Build error: none.
- Four serverless Functions detected: `book-consultation`, `booking-slots`, `manage-booking`, and `sync-client-needs`.
- One Edge Function detected: `site-response`.
- 48 redirect rules and six header rules processed without error.
- 191 files secret-scanned with no standard or enhanced secret match.
- Preview remains unpublished and separate from production.

## Milestone 4 website remediation

Resolved release-candidate issues:

1. Legacy analytics events are discarded before current-version analytics consent.
2. Duplicate mobile-navigation handlers are removed before global shell binding.
3. Current-page navigation indication is applied with `aria-current`.
4. Clean workflow, career, contact, and legal routes are available while legacy URLs redirect once.
5. Canonical and Open Graph URLs are normalized for clean routes.
6. Production sitemap now includes approved public routes and excludes confirmations, errors, previews, APIs, recovery, and duplicate routes.
7. Consultation and Needs Check static definitions separate required processing consent from optional marketing permission.
8. Needs Check now records consent versions/timestamp and retains a hidden legacy compatibility field for the existing 24-column sync.
9. Legacy `contact.html` is retired behind the clean `/contact/` route and retained only as a noindex compatibility/form-definition source.
10. Preview isolation, noindex headers, existing API paths, Functions, security headers, and production webhook behavior remain protected.

See `docs/milestone-4-remediation-register.md` for evidence and status.

## Clean routes

| Canonical public route | Static source | Legacy compatibility |
|---|---|---|
| `/about/` | `about.html` | `/about.html` redirects |
| `/services/` | `services.html` | `/services.html` redirects |
| `/consultation/` | `needs-check.html` | `/needs-check` and `/needs-check.html` redirect |
| `/consultation/confirmation/` | `consultation-confirmation.html` | Legacy confirmation path redirects |
| `/consultation/booking-confirmation/` | `booking-confirmation.html` | Legacy booking confirmation redirects |
| `/client-support/` | `client-support.html` | Legacy path redirects |
| `/client-support/confirmation/` | `support-confirmation.html` | Legacy path redirects |
| `/careers/` | `join-our-team.html` | Legacy path redirects |
| `/careers/opportunities/` | `career-opportunities.html` | Legacy path redirects |
| `/careers/process/` | `recruitment-process.html` | Legacy path redirects |
| `/careers/apply/` | `recruitment-application.html` | Legacy path redirects |
| `/careers/confirmation/` | `recruitment-confirmation.html` | Legacy path redirects |
| `/contact/` | `general-inquiry.html` | `/general-inquiry.html` and legacy `contact.html` redirect |
| `/contact/confirmation/` | `contact-confirmation.html` | Legacy path redirects |
| `/privacy/` | `privacy-policy.html` | Legacy path redirects |
| `/terms/` | `terms.html` | Legacy path redirects |
| `/disclaimer/` | `disclaimer.html` | Legacy path redirects |
| `/cookies/` | `cookie-policy.html` | Legacy path redirects |

API routes are excluded from the Edge Function and remain unchanged:

- `/api/booking-slots`
- `/api/book-consultation`
- `/api/manage-booking`

## Navigation and footer

The global shell now provides consistent desktop/mobile navigation, a primary Start Consultation CTA, Client Support, Careers, Contact, legal routes, approved contact links, and Cookie Preferences. It replaces existing footer markup at runtime and safely rebinds mobile navigation to avoid duplicate event handlers.

## Consent and analytics

Consent version: `cookie-consent-v2-2026-07-24`.

- Analytics and marketing default to denied.
- GA4 loads dynamically only after analytics consent.
- Legacy `gtag("event")` calls are dropped before consent.
- Returning current-version choices are applied before optional script loading.
- Outdated consent versions are treated as no current consent.
- Rejection does not disable essential form, booking-session, confirmation, navigation, or preference functions.
- GA cookies are removed where browser controls permit after rejection.
- Meta Pixel remains disabled even though the category is displayed.
- Central analytics rejects PII-like keys and only permits approved bounded workflow parameters.

Browser network-panel verification remains manual and release-blocking.

## Netlify Forms

Detected forms:

- `consultation`
- `client-needs-check`
- `consultation-recovery`
- `client-support`
- `recruitment-application`
- `general-inquiry`

Confirmed:

- Honeypots remain enabled.
- Needs Check detection includes processing consent, optional marketing consent, consent versions, and timestamp.
- Support, recruitment, general inquiry, and recovery forms remain detected.
- Resume upload remains absent.

Known Netlify dashboard limitation:

- The existing `consultation` form record still displays its earlier detected field list until Netlify refreshes that existing form definition or receives a compatible submission. The committed static source and browser payload now include separate processing/marketing consent fields and versions.
- No synthetic consultation submission was sent because the existing verified submission event could invoke the protected downstream webhook, and cross-system TEST submissions are prohibited during active Operations Hub maintenance.
- This form-schema display must be rechecked in an approved isolated Netlify test site or after downstream event isolation before production approval.

## QA evidence

See:

- `docs/milestone-4-qa.md`
- `docs/milestone-4-screenshot-index.md`
- `docs/milestone-4-remediation-register.md`

Completed through deployed metadata or source inspection:

- Netlify build and resource detection.
- Secret scan.
- Preview noindex controls.
- Clean-route/canonical/sitemap logic.
- Form labels, validation foundations, honeypots, consent schemas, and confirmation destinations.
- Keyboard/Escape/focus-management source logic.
- Responsive CSS foundations and reduced motion.
- Analytics event/parameter allowlists and PII key rejection.
- Preview booking isolation from live integrations.

Not completed by the connected environment:

- Chromium, Firefox, and WebKit/Safari manual testing.
- 200% zoom and all keyboard sequences on rendered pages.
- Full 1440/1280/768/390/320 screenshot matrix.
- Lighthouse and Core Web Vitals evidence.
- Browser console/network/cookie inspection.
- Live Google Calendar, Meet, email, Hub sync, or Apps Script integration.

Automated screenshot evidence:

- [Netlify runtime RC homepage screenshot](https://d33wubrfki0l68.cloudfront.net/6a63879c1d9f7700088e2ad5/screenshot_2026-07-24-15-41-32-0000.webp)

## Read-only Operations Hub inspection

The supplied UAT-04 commit was confirmed as a TEST-only Reporting Month normalization trigger. The Hub README identifies the repository as the controlled TEST source/deployment entry point and states production is outside scope.

Read-only source observations:

- Hub runtime configuration controls duration, slot interval, before/after buffers, timezone, Calendar binding, Meet behavior, and invite/reminder behavior.
- Availability returns effective duration, interval, buffers, timezone, owner, and slots.
- Final booking and rescheduling revalidate rules and Calendar conflicts.
- Idempotency replay and active-booking duplicate handling are present.
- Calendar creation, database/log writes, rollbacks, reconciliation, cancellation, and management-token behavior have explicit status paths.
- Calendar events are private; management token hashes are stored in private extended properties/database records rather than exposed in Calendar descriptions under the inspected hardened contract.
- The inspected public booking entry point maps workflow-token claims, start, and idempotency key; it does not show use of the website `scheduling` object.

Complete findings and proposals are in `docs/operations-hub-read-only-contract.md`.

## Scheduling compatibility and decision

Current website-compatible profile remains documented as:

```text
CONSULTATION_DURATION_MINUTES=30
CONSULTATION_BUFFER_BEFORE_MINUTES=30
CONSULTATION_BUFFER_AFTER_MINUTES=30
```

Blueprint profile remains inactive:

```text
CONSULTATION_DURATION_MINUTES=45
CONSULTATION_BUFFER_BEFORE_MINUTES=15
CONSULTATION_BUFFER_AFTER_MINUTES=15
CONSULTATION_MIN_NOTICE_HOURS=4
CONSULTATION_MAX_ADVANCE_DAYS=30
```

The Hub’s protected runtime configuration remains the effective rule. The website `scheduling` object is not confirmed as consumed. Option comparison and approval register are in `docs/milestone-4-decision-register.md`.

## Proposed Operations Hub changes

> **Proposed only — not applied while UAT-04 or other Operations Hub maintenance remains active. Separate approval is required before implementation.**

The website repository contains review-only proposals for:

- Versioned scheduling payload and `effective_scheduling` response.
- Protected range validation and runtime fallback.
- Consent-version data mapping.
- Shared status/error vocabulary.
- Source-of-truth assignments.
- Regression test cases.
- Deployment prerequisites and future rollback procedure.

No proposal is represented as implemented.

## Business, privacy, compliance, and operational approvals

Pending decisions:

- Scheduling Option 1, Option 2, or custom profile.
- Data retention and deletion periods.
- Client-support owner, escalation route, and response language.
- Legal/privacy wording review.
- Public services/provider/leadership content verification.
- Recruitment classification and any future compensation wording.
- Meta Pixel approval or permanent rejection.
- Operations Hub maintenance completion.
- Separate TEST integration authorization.
- Separate Apps Script modification/deployment authorization.
- Website production merge/deploy approval.

## Production readiness

Current status: **not production-ready**.

Technical source remediation and the non-production runtime build are substantially complete. Production remains blocked by:

1. Manual multi-browser, mobile, zoom, accessibility, console, and network QA.
2. Full stakeholder screenshot review.
3. Isolated verification of the updated `consultation` Netlify form schema without triggering Hub TEST integration.
4. Required business/privacy/compliance decisions.
5. Any decision that the production website must launch with live Operations Hub integration; that work remains on hold.

A website-only production release could be reconsidered after items 1–4 are completed and explicit approval is given, while keeping unapproved Hub integration disabled or unchanged.

## Rollback package

Current production rollback baseline:

- Website source commit: `e9853d2d080f684dcb1e361856fe0a377224055e`.
- Existing production website remains active and unchanged.
- Previous production deployment remains the immediate hosting rollback baseline.

Proposed website restore procedure after an authorized future release:

1. Confirm the last known production deploy and environment-variable contexts.
2. Repoint or redeploy the recorded production source commit.
3. Verify homepage, consultation/needs-check, Forms, API endpoints, booking management, security headers, redirects, robots, and sitemap.
4. Confirm Google webhook environment variables by presence/context only; never expose values.
5. Run approved smoke tests and confirm no duplicate notifications or records.

No Operations Hub rollback procedure is required because Milestone 4 made no Operations Hub change.

## Operations Hub hold notice

> **The Avodah Operations Hub repository was used only as a read-only integration reference during Milestone 4. No branch, source file, workflow, deployment, Script Property, Apps Script version, or TEST record was created or modified. Operations Hub implementation work must wait until UAT-04 and all other active maintenance have been completed, the repository and TEST deployment are confirmed stable, and the integration work has received separate approval.**

## Recommended next action

Conduct a stakeholder-led manual release-candidate review using the Deploy Preview and the screenshot/browser checklist. Record defects and decisions in the remediation and decision registers. Do not mark Pull Request #8 ready, merge, or deploy production until the blocking manual QA and approvals are complete.
