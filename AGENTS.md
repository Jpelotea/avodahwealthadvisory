# AGENTS.md
## 1. Repository Purpose
This repository contains the Avodah Wealth Advisory public website plus the
build, verification, Netlify, and production-sensitive integration source used
to prepare and review it.

The public site is primarily HTML, CSS, and JavaScript. The active development
branch also uses Node-based static-site preparation, unit tests, Playwright,
isolated Netlify Forms fixtures, security checks, and release-evidence
workflows.

Treat financial-service wording, recruitment wording, privacy and consent,
scheduling, production integrations, and customer-facing claims as
approval-sensitive.

## 2. Instruction Priority
Follow, in order:

1. System and platform safety rules.
2. The user's explicit task instructions.
3. The nearest applicable `AGENTS.md`.
4. Verified repository source and documentation.
5. Normal engineering conventions.

Do not infer authorization from an existing credential, workflow, branch,
deployment, or past test run. Stop before destructive or production-affecting
work when instructions conflict.

## 3. Current Project Controls
Current controlled work is associated with:

- Repository: `Jpelotea/avodahwealthadvisory`
- Working branch: `agent/blueprint-foundation`
- Draft Pull Request: `#8`

These are time-sensitive. Verify the current branch, head, PR state, base, and
production `main` revision before acting.

Durable controls:

- Keep PR #8 draft and unmerged unless separately authorized.
- Do not push directly to `main`.
- Do not deploy the public website to production without explicit approval.
- Keep scheduling at `30/30/30` unless an approved change replaces it.
- Meta Pixel remains disabled unless separately approved.
- Do not contact production integrations during tests.
- Never treat a Deploy Preview as production.
- Automated evidence does not complete human or stakeholder review.

## 4. Repository Map and Build Model
### Raw public source
The repository root contains public `*.html`, `*.css`, `*.js`, images, route
files, `_redirects`, `netlify.toml`, `netlify/functions/`, and
`netlify/edge-functions/`.

These tracked inputs are not always byte-for-byte identical to the prepared
Deploy Preview.

### Build and remediation
- `package.json` — verified build and test commands
- `scripts/prepare-static-site.mjs` — build entrypoint
- `scripts/apply-milestone-12d-remediation.mjs` — approved normalization
- Other `scripts/` — release gates, Forms preflight, schema inspection,
  synthetic tests, cleanup, and HTTP-isolation checks

Preparation may apply approved HTML remediation, normalize routes and assets,
remove legacy analytics loaders, generate revision evidence, write
non-production headers, and add preview `noindex` protection.

`netlify.toml` runs `npm run build` and publishes `.`. The build prepares files
in the repository root and may modify tracked HTML in place. Use a clean or
disposable worktree and inspect `git diff` afterward.

### Tests and fixtures
- `tests/unit/` — Node unit and contract tests
- `tests/e2e/` — Playwright browser, accessibility, HTTP, release, and security
  tests
- `playwright.config.mjs` — Chromium, Firefox, and WebKit
- `qa/form-fixture/` — static isolated Forms fixture
- `tests/netlify-forms-fixture/` — fixture-specific Netlify configuration

The external isolated test project is `avodah-form-verification-m5`. Fixture
source and verification scripts live in this repository.

### Documentation and integrations
- `docs/` — architecture, QA, scheduling, isolation, and milestone records
- `docs/release/` — human review, approvals, defects, and release decisions
- `.github/workflows/` — browser, security, release, and isolated Forms controls
- `integrations/google-apps-script/` — production-sensitive integration source

Release evidence is time-sensitive. Reverify current source and deployment
metadata before relying on an older report.

## 5. Safe Development Workflow
Before editing:

```bash
git branch --show-current
git status --short
git rev-parse HEAD
git fetch origin
```

Confirm branch and scope. Retrieve a baseline file directly from `main` when
needed; do not merge or modify `main` merely to obtain it.

Install and prepare:

```bash
npm install
npm run build
```

Then inspect:

```bash
git status --short
git diff --stat
git diff
```

Basic prepared-site inspection:

```bash
npm install
npm run build
python -m http.server 8000
```

Open `http://localhost:8000`. A raw server started before the build is useful
only for limited inspection and is not equivalent to the Deploy Preview.

Do not use `file://` for forms, routing, consent, fetch, modules, or other
dynamic behavior.

Install Playwright browsers when required:

```bash
npx playwright install
```

`npm run test:e2e` uses `PLAYWRIGHT_BASE_URL` when set; otherwise it uses the
configured Deploy Preview. Exact-revision, Edge, and release tests may require
a deployed preview and may not pass against a basic local server.

## 6. Verified Commands
The current `package.json` defines:

```bash
npm run build
npm test
npm run test:unit
npm run test:e2e
```

- `npm run build` runs `node scripts/prepare-static-site.mjs`.
- `npm test` and `npm run test:unit` run the Node unit suite.
- `npm run test:e2e` runs Playwright.

Targeted examples:

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

Do not report a pass unless the command or authoritative workflow completed at
the stated revision.

## 7. Testing by Change Type
### Documentation only
- Verify branch and head.
- Check links, commands, names, and sensitive data.
- Search for prohibited and stale guidance.
- Confirm only intended documentation changed.
- Do not trigger deployment or integration workflows.

Run technical suites only when needed to validate a technical claim.

### Public HTML, CSS, JavaScript, or routes
Run as applicable:

```bash
npm run build
npm run test:unit
npm run test:e2e
```

Verify prepared output, routes/assets, all three browser engines,
accessibility, zoom/reflow, consent-network behavior, exact deployed revision,
and Lighthouse when required. Automation does not replace human testing.

### Build scripts or `netlify.toml`
Verify build command, publish directory, generated evidence, preview `noindex`,
redirects, headers, CSP, Functions/Edge packaging, and exact-revision gates.
A local root server does not reproduce all Netlify processing.

### Forms or confirmation behavior
Verify required/optional fields, honeypot, consent separation, confirmation
routes, live isolated schemas, synthetic submissions, complete cleanup, and
zero contact with production webhook, email, Google services, or Operations
Hub. Protected workflows require explicit authorization.

### Consent or analytics
Verify default-denied analytics, consent-gated loading, implemented revocation,
form operation when marketing is declined, no analytics PII, Meta Pixel still
disabled, and environment-appropriate CSP.

### Functions, Edge, or Apps Script
Treat as production-sensitive. Do not deploy, reauthorize, or change production
properties without approval. Use synthetic data and non-production targets,
record the environment, verify secrets and isolation, and stop if production is
contacted unexpectedly.

## 8. Forms, Consent, and Analytics
Keep these separate:

### Processing consent
Authorizes handling information needed to answer the submitted request.
Required processing consent may block submission when absent.

### Marketing consent
Optional permission for future marketing contact. Declining it must not block a
legitimate consultation, support request, application, or inquiry. Legacy
compatibility fields must not convert processing permission into marketing
permission.

### Analytics-cookie consent
Controlled by the website cookie/analytics preference mechanism. It is not
granted by processing consent, marketing consent, or form submission.

Current behavior defaults analytics storage to denied and loads analytics only
when analytics preference is granted.

Durable rules:

- Do not enable GA4 from processing or marketing consent.
- Do not send analytics before analytics-cookie consent.
- Do not send form PII, identifiers, references, files, or sensitive free text.
- Use the repository event and parameter allowlists.
- Follow the implemented revocation behavior.
- Keep advertising storage and personalization denied unless approved.
- Keep Meta Pixel disabled.

CSP is environment-specific. Production or preview CSP may allow approved
analytics origins only when required by the consent-gated architecture. Google Tag Manager is not an unconditional requirement. The isolated Forms fixture
must exclude analytics and production-integration origins.

Verify source before naming a loader, event, storage key, measurement ID, or
consent version.

## 9. Protected Workflows and Integrations
Existing workflow categories include:

- Browser and accessibility verification
- Exact-revision and release gates
- Lighthouse and performance evidence
- CodeQL and security verification
- Isolated Forms preflight and access
- Isolated fixture deployment
- Live schema retrieval
- Synthetic Forms tests and cleanup
- Fixture HTTP/CSP isolation
- Required-field browser validation
- Release evidence artifacts

Protected workflows may require manual dispatch, exact confirmation input,
protected secret presence, Site-ID validation, exact revision validation,
PR-title/commit markers, single-file request markers, and isolation gates.

Their existence is not authorization to run them. Never weaken or bypass a
fail-closed gate.

Secret names may be documented when needed:

- `NETLIFY_FORM_TEST_AUTH_TOKEN`
- `NETLIFY_FORM_TEST_SITE_ID`

Never retrieve, print, hash, log, quote, or expose secret values.

## 10. Isolated Netlify Forms Requirements
For the isolated project:

- Use protected test credentials only.
- Validate the approved isolated Site ID.
- Use the dedicated fixture configuration boundary, not the public root.
- Require zero Netlify Functions and zero Edge Functions.
- Require no production redirects, integrations, hooks, or analytics.
- Require `noindex`, `Cache-Control: no-store`, and
  `Referrer-Policy: no-referrer`.
- Use unmistakably synthetic data only.
- Inspect verified and spam storage when validating records.
- Delete every synthetic record and report cleanup failures.

Isolated evidence is not production approval.

## 11. Deployment Environments
### Local
Prepared local output supports basic review but does not prove Netlify headers,
redirects, Forms detection, Functions, Edge behavior, or exact deployment.

### Deploy Preview
Preferred public-source review environment. Verify and report:

```text
<COMMIT_SHA>
<DEPLOY_PREVIEW_URL>
<IMMUTABLE_DEPLOY_URL>
<DEPLOY_ID>
```

Confirm it is non-production and protected from indexing.

### Isolated Forms project
Use only for approved schema, submission, consent, honeypot, confirmation, and
cleanup checks. Keep it isolated from production.

### Production
Requires explicit authorization after technical, human, and stakeholder gates.
Do not use a direct push to `main` as the deployment procedure.

## 12. Secrets and Sensitive Identifiers
Never include in source comments, documentation, logs, prompts, reports,
commits, or responses:

- Production spreadsheet IDs
- Production calendar emails or IDs
- Production webhook or Apps Script URLs
- Tokens, credential fragments, secret hashes, or authorization headers
- Private operational addresses
- Real client, applicant, or support data

Use safe descriptions such as `Production lead spreadsheet`, `Production
booking calendar`, and `Production Apps Script endpoint`.

Secret and configuration-key names may be documented when necessary, never
their values. Tests must use synthetic names, reserved invalid domains, test
phone numbers, and explicit test references.

## 13. Human-Review Limitations
Automated browser, axe, Lighthouse, unit, schema, and security checks do not
complete human accessibility or stakeholder review.

Never fabricate human observations, screen-reader results, keyboard or mobile
findings, legal/privacy/compliance approval, business approval, merge approval,
or production approval.

Record unperformed checks as `NOT TESTED` or `RETEST REQUIRED`. A confirmed
Critical or High defect returns the release to `NO-GO`. Do not assign full `GO`
while required human checks or stakeholder approvals remain pending.

## 14. Required Response Format
For repository changes, report:

1. Repository and branch inspected
2. Starting and ending revisions
3. Pull Request state
4. Scope and files changed
5. Verified repository facts
6. Commands or workflows run
7. Test results, including failures/retries
8. Deployment activity, if authorized
9. Production-isolation and secret-handling results
10. Human-review status
11. Remaining technical, human, and approval blockers
12. Production `main` and Operations Hub status
13. Recommended next action

Use placeholders for transient example values. Do not claim completion while a
required check is pending.

## 15. Operations Hub Hold
> **The Avodah Operations Hub repository remains read-only. Operations Hub implementation work must wait until UAT-04 and all other active maintenance have been completed, the repository and TEST deployment have been confirmed stable, and the integration work has received separate approval.**

Do not add website-to-Hub, applicant-status, scheduling, lead-sync, or reporting
implementation instructions without separate authorization.
