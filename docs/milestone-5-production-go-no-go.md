# Milestone 5 production go/no-go package

Prepared: 2026-07-25

## Decision

**NO-GO — release blockers remain.**

The release candidate is technically safer than Milestone 4 because preview and branch form submissions can no longer invoke the downstream Google Sheets webhook. However, genuine multi-browser, rendered responsive/zoom, browser-network, accessibility-tool, and isolated synthetic-submission verification could not be completed from the available execution environment. Required business, legal, privacy, support-ownership, retention, scheduling, and production approvals also remain pending.

## Website baseline

- Repository: `Jpelotea/avodahwealthadvisory`
- Branch: `agent/blueprint-foundation`
- Draft PR: <https://github.com/Jpelotea/avodahwealthadvisory/pull/8>
- Deploy Preview: <https://deploy-preview-8--avodahwealthadvisory.netlify.app>
- Latest tested runtime commit: `5b84705c46a11e130924aa46a4bfb779eb290a2c`
- Immutable preview: <https://6a639769e59d0900073dd883--avodahwealthadvisory.netlify.app>
- Deploy ID: `6a639769e59d0900073dd883`
- Production baseline: `e9853d2d080f684dcb1e361856fe0a377224055e`
- Production merge/deploy: not performed

## Release-candidate verification

Confirmed:

- Branch is 56 commits ahead of `main` and zero behind at the beginning of Milestone 5.
- The production baseline remains unchanged.
- The latest deploy completed with no build error.
- Four Netlify Functions and one Edge Function were detected.
- 48 redirect rules and six header rules processed without error.
- 194 files were secret-scanned with no matches.
- Preview noindex behavior and preview booking simulation remain in place.
- `/api/booking-slots`, `/api/book-consultation`, and `/api/manage-booking` remain unchanged.
- Meta Pixel and resume upload remain disabled.

## Isolated form-testing environment

Created Netlify project:

- Name: `avodah-form-verification-m5`
- Purpose: disposable form-schema and synthetic-submission verification
- Production environment variables: none copied
- Forms: enabled
- Deployment: not completed
- Submission testing: not completed

The project was deliberately left without production secrets, webhook endpoints, Google Calendar/Meet configuration, Operations Hub configuration, or production email recipients. The available connector could create and configure the project but could not deploy repository files into it.

## Preview form isolation correction

Commit `5b84705c46a11e130924aa46a4bfb779eb290a2c` updates `netlify/functions/sync-client-needs.mjs` so downstream form synchronization is refused unless the Netlify context is `production`.

Behavior:

- `deploy-preview`: form record may be retained by Netlify, downstream webhook is skipped.
- `branch-deploy`: downstream webhook is skipped.
- non-production contexts: downstream webhook is skipped.
- `production`: existing webhook behavior remains available.

The existing 24-column compatibility mapping now accepts either `consent` or `processing_consent`. Optional marketing permission is not mapped into the legacy processing-consent column.

## Consultation form schema

Committed static schema includes:

- `lead_submission_id`
- `lead_source`
- `source_page`
- `full_name`
- `mobile_number`
- `email`
- `location`
- `inquiry_type`
- `preferred_contact_method`
- `preferred_schedule`
- `message`
- `processing_consent`
- `processing_consent_version`
- `marketing_consent`
- `marketing_consent_version`
- `consent_recorded_at`
- UTM and campaign attribution fields
- honeypot field
- hidden legacy `consent` compatibility field

The compatibility field mirrors required processing consent only. It does not reflect optional marketing permission and cannot mark marketing permission granted when it was declined.

Netlify dashboard refresh of the existing production-site `consultation` form and isolated synthetic submission remain unverified.

## Forms test matrix

| Form | Detection | Honeypot | Static schema | Synthetic submission | Production downstream blocked |
|---|---|---|---|---|---|
| consultation | Detected on existing site | Yes | Verified | Pending | Yes in preview/branch contexts |
| client-needs-check | Detected | Yes | Verified | Pending | Yes in preview/branch contexts |
| consultation-recovery | Detected | Yes | Verified | Pending | No Hub event handler applies |
| client-support | Detected | Yes | Verified | Pending | No Hub event handler applies |
| recruitment-application | Detected | Yes | Verified; no upload | Pending | No Hub event handler applies |
| general-inquiry | Detected | Yes | Verified | Pending | No Hub event handler applies |

## Browser, responsive, zoom, accessibility, and network testing

Actually executed browser engines: **none**.

Reason: the available local browser runner could not resolve the external GitHub or Netlify hosts, and no browser-automation connector was available. Source inspection and Netlify deployment metadata are not represented as genuine browser testing.

Pending release blockers:

- Chromium rendered testing
- Firefox rendered testing
- WebKit/Safari-compatible rendered testing
- 1440, 1280, 768, 390, and 320 pixel screenshot matrix
- 100%, 200%, and 400% zoom checks
- keyboard-only workflow traversal
- cookie-dialog focus containment/restoration confirmation
- automated WCAG scan plus manual screen-reader-oriented checks
- browser console inspection
- network-panel consent verification
- GA request and payload inspection
- Lighthouse and Core Web Vitals evidence

Automated Netlify homepage screenshot for the latest runtime deploy:

<https://d33wubrfki0l68.cloudfront.net/6a639769e59d0900073dd883/screenshot_2026-07-24-16-49-04-0000.webp>

## Consent and analytics verification status

Source and deployment configuration confirm:

- denied-by-default analytics and marketing storage
- dynamic GA4 loading only after current-version analytics permission
- Meta Pixel disabled
- allowlisted analytics events and parameters
- PII-like analytics keys rejected
- legacy analytics events blocked before consent
- preference reopening and revocation code present
- current version: `cookie-consent-v2-2026-07-24`

Browser-network evidence remains pending and blocks production approval.

## Performance and technical results

Available evidence:

- Build: successful
- Functions: 4
- Edge Functions: 1
- Redirects: 48 processed without error
- Header rules: 6 processed without error
- Secret scan: 194 files, zero matches
- Latest deploy time: 18 seconds
- JavaScript console: not tested in rendered browser
- Failed network requests: not tested in rendered browser
- Lighthouse: unavailable
- Core Web Vitals: unavailable

## Scheduling decision

No scheduling change was made.

| Area | Current 30/30/30 | Proposed 45/15/15 |
|---|---|---|
| Consultation length | 30 minutes | 45 minutes |
| Before buffer | 30 minutes | 15 minutes |
| After buffer | 30 minutes | 15 minutes |
| Total protected block | 90 minutes | 75 minutes |
| Daily capacity | Lower than a 30-minute no-buffer model; predictable recovery time | Potentially higher than 30/30/30 despite longer meeting because total block is shorter |
| Preparation/follow-up | Larger dedicated buffer | Smaller dedicated buffer |
| Visitor expectation | Shorter focused consultation | Longer, more detailed consultation |

Required explicit decision: retain `30/30/30`, adopt `45/15/15`, or approve another profile.

## Business and compliance register

Pending and not approved:

- final scheduling profile
- public services and provider wording
- leadership and team content
- legal and privacy text
- consent wording approval
- retention periods
- deletion process
- client-support owner
- claims, payment, privacy, and complaint escalation owners
- support response-time language
- recruitment classification
- compensation wording
- Meta Pixel decision
- Operations Hub maintenance completion
- TEST integration authorization
- Apps Script modification authorization
- production merge authorization
- production deployment authorization

## Operations Hub hold

The Avodah Operations Hub repository remains read-only. Operations Hub implementation work must wait until UAT-04 and all other active maintenance have been completed, the repository and TEST deployment have been confirmed stable, and the integration work has received separate approval.

No Operations Hub branch, file, commit, workflow, deployment, Apps Script version, Script Property, configuration, or TEST record was created or modified during Milestone 5.

## Production checklist

### Passed

- build succeeds
- secret scan passes
- preview isolation strengthened
- clean-route and redirect deployment succeeds
- sitemap and metadata source controls remain present
- Functions and Edge Function detected
- production branch unchanged
- rollback source commit recorded
- Operations Hub unchanged

### Pending/blocking

- isolated form site deployment and synthetic form verification
- consultation Netlify-detected schema refresh confirmation
- all-form synthetic submission matrix
- rendered multi-browser QA
- mobile and zoom QA
- keyboard QA
- accessibility scan and manual verification
- network-panel consent evidence
- full screenshot review
- Lighthouse/performance evidence where available
- stakeholder decisions and approvals

## Recommended next action

Use a browser-capable QA workstation or CI service with Chromium, Firefox, and WebKit access to run the committed checklist against the Deploy Preview. Deploy the form-only fixture to `avodah-form-verification-m5`, submit synthetic records, confirm the exact detected fields, delete or label the records, then update this package. Keep PR #8 draft and do not merge or deploy production until every blocker is resolved and explicit authorization is given.
