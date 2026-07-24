# Milestone 6 technical verification

Prepared: 2026-07-25

Status: **NO-GO — technical verification remains incomplete**

## Baseline and protections

- Branch: `agent/blueprint-foundation`
- Pull request: #8 remains open, draft, and unmerged.
- Production `main` remains unchanged.
- The Deploy Preview remains non-production.
- `sync-client-needs.mjs` permits downstream synchronization only when the server-side Netlify `CONTEXT` is `production`.
- Client-controlled fields cannot change the server-side context decision.
- No Operations Hub repository change, workflow, deployment, Script Property update, Apps Script version, or TEST record was created.

## Milestone 6 implementation

Added:

- `package.json`
- `playwright.config.mjs`
- `tests/e2e/release-candidate.spec.mjs`
- `tests/unit/sync-context.test.mjs`
- `.github/workflows/milestone-6-browser-qa.yml`

The Playwright workflow is configured to launch Chromium, Firefox, and WebKit against the Deploy Preview. It captures HTML/JSON reports, traces, failure videos, axe results, consent-network evidence, five-width screenshots, route/redirect results, non-indexing checks, horizontal-overflow checks, form-consent separation, and keyboard smoke results.

## Form-isolation tests

Unit tests cover:

- `deploy-preview` blocks downstream fetch.
- `branch-deploy` blocks downstream fetch.
- `dev` and `branch` contexts block downstream fetch.
- Client form fields claiming `production` cannot bypass the guard.
- Actual server-side `production` retains the existing downstream call contract.

The tests are committed but a completed CI result was not available at preparation time.

## Isolated form project

Project: `avodah-form-verification-m5`

- Forms enabled.
- No production environment variables were copied.
- A six-form static fixture was prepared locally with no Functions, analytics IDs, email recipients, Calendar credentials, Apps Script credentials, or Operations Hub credentials.
- The available authenticated deploy command could not complete from the restricted execution environment.
- No synthetic submissions were made.
- Exact Netlify-detected fixture schemas therefore remain unverified.

## Browser and accessibility status

Actual completed engine runs: **none yet**.

The repeatable CI workflow is present, but no completed GitHub Actions run or artifact was available. Chromium, Firefox, WebKit, screenshot matrix, axe results, keyboard results, network consent evidence, and performance evidence remain pending.

Viewport resizing in the committed workflow is not represented as genuine browser zoom. Manual 200% and 400% browser zoom remains required even after CI reflow checks pass.

## Go/no-go

**NO-GO**

Technical blockers:

1. Isolated fixture deployment and exact Netlify form-schema detection.
2. Synthetic submissions for all six forms.
3. Completed Chromium, Firefox, and WebKit CI runs.
4. Screenshot artifact review.
5. Automated accessibility and keyboard evidence review.
6. Consent network evidence, including accepted and revoked states.
7. Lighthouse/performance evidence.
8. Manual genuine browser zoom and human screen-reader review.

Approval blockers remain unchanged in the decision register.

## Operations Hub hold

The Avodah Operations Hub repository remains read-only. Operations Hub implementation work must wait until UAT-04 and all other active maintenance have been completed, the repository and TEST deployment have been confirmed stable, and the integration work has received separate approval.
