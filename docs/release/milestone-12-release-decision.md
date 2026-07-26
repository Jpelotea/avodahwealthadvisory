# Milestone 12 Release Decision

**Prepared:** July 26, 2026  
**Decision:** **CONDITIONAL GO**  
**Pull Request:** [#8](https://github.com/Jpelotea/avodahwealthadvisory/pull/8) — open, draft, and unmerged

This decision is not permission to merge or deploy production.

## Accepted Milestone 11A baseline

The following technical results remain accepted and closed unless new regression evidence appears:

- protected credentials and isolated-project access passed;
- clean fixture deployment passed;
- Netlify Functions count is zero in the isolated fixture;
- Edge Functions count is zero in the isolated fixture;
- production configuration contamination was removed;
- exactly six Netlify Forms were detected;
- all six live schemas passed;
- full synthetic testing passed after targeted closure;
- processing and marketing consent separation passed;
- honeypot behavior was verified;
- duplicate and navigation behavior was documented;
- confirmation routes passed;
- analytics contained no form PII;
- no production integration was contacted;
- all synthetic submissions were deleted;
- CodeQL passed;
- no Critical or High technical blocker remains in Milestone 11 scope.

Completed technical gates were not repeated during Milestone 12 documentation preparation.

## Human-review target

| Item | Verified value |
|---|---|
| Preview URL | https://deploy-preview-8--avodahwealthadvisory.netlify.app |
| Immutable deployment | https://6a645172fbef1d00086b76c0--avodahwealthadvisory.netlify.app |
| Deploy ID | `6a645172fbef1d00086b76c0` |
| Branch | `agent/blueprint-foundation` |
| Public website source revision | `e79e4f6fa6505b585c8fe17177db26adf4fb72eb` |
| Current accepted Milestone 11A head before documentation | `a1061b14f486c474668c3bee279379df4a5e63d1` |
| Source correspondence | The current branch is ahead of the accepted public revision through test-infrastructure, workflow-gate, and release-document changes only. Public browser-facing source remains the accepted Milestone 10 revision. |
| Indexing protection | Deploy-preview meta robots and `X-Robots-Tag` specify `noindex, nofollow, noarchive`. |
| Production target? | No. The review target is a Netlify deploy preview. |

No new public website deployment was created because later commits did not change public website source.

## Human accessibility status

| Status | Count |
|---|---:|
| PASS | 0 |
| FAIL | 0 |
| PARTIAL | 0 |
| NOT TESTED | 59 |
| NOT APPLICABLE | 0 |

Completed human tests: **none**.

No reviewer name, environment, date, or result has been fabricated. The complete review matrix is in `milestone-12-human-accessibility-review.md`.

Required human-review blockers include:

- Chromium 100%, 200%, and 400% zoom/reflow;
- independent Firefox zoom/reflow;
- NVDA screen-reader review;
- VoiceOver/Safari review when a suitable device and reviewer are available;
- keyboard-only consultation workflow;
- mobile-menu keyboard interaction;
- public-form error usability;
- visible focus;
- narrow-layout and 400% reflow edge cases;
- human contrast edge cases;
- mobile touch targets.

## Accessibility defects

Confirmed Critical defects: **0**  
Confirmed High defects: **0**  
Confirmed Moderate defects: **0**  
Confirmed Low defects: **0**  
Confirmed Advisory issues: **0**

This does not indicate an accessibility pass. No defect can be confirmed or excluded until genuine human testing is performed. Review gaps are listed in `milestone-12-open-defects.md`.

Any confirmed Critical or High accessibility defect changes this decision to **NO-GO**.

## Stakeholder approvals

All required decisions remain **PENDING**:

- human accessibility sign-off;
- business and public-service wording;
- provider and product wording;
- legal, privacy, and consent;
- retention and deletion;
- compliance;
- recruitment wording and process;
- client-support ownership and response-time wording;
- public contact and availability information;
- scheduling;
- Meta Pixel;
- analytics and campaign tracking;
- native Netlify Forms duplicate handling;
- final stakeholder release recommendation;
- merge authorization;
- production deployment authorization.

The complete decision and retention registers are in `milestone-12-approval-register.md`.

## Current operational decisions

### Scheduling

- Active configuration: 30-minute consultation, 30-minute buffer before, 30-minute buffer after.
- Proposed inactive configuration: 45-minute consultation, 15-minute buffer before, 15-minute buffer after.
- Formal Milestone 12 decision: **DECISION PENDING**.
- No scheduling setting was changed.

### Meta Pixel

- Technical state: disabled.
- Formal decision: **DECISION PENDING**.
- No activation or implementation is authorized.

### Native Netlify Forms duplicates

- Accepted limitation: reused workflow references and repeat POST behavior may create distinguishable duplicate records.
- Current distinction mechanism: `lead_submission_id` provides record-level distinction in accepted technical evidence.
- Operational owner, review process, service/reporting impact, and future idempotency decision: **PENDING**.
- No new server-side submission architecture is authorized.

### Retention and deletion

- Approved periods: none recorded.
- Approved deletion triggers and owners: none recorded.
- Decision: **PENDING**.

### Client support

- Queue owner, alert recipient, monitor, operating hours, escalation, acknowledgement target, urgent-request limitation, out-of-scope process, and backup owner: **PENDING**.
- No response-time promise is authorized.

## Public-source corrections

None.

Milestone 12 preparation changed documentation only. It did not change:

- public HTML or CSS;
- shared public JavaScript;
- public routes;
- forms or consent behavior;
- Netlify Functions or Edge Functions;
- production Netlify configuration;
- active scheduling;
- Meta Pixel;
- Operations Hub source or configuration.

## Required regression testing

No automated browser, accessibility, Lighthouse, consent-network, CSP, Forms, schema, synthetic-submission, cleanup, or CodeQL rerun is required for these documentation-only changes.

When an approved public-source correction is made, rerun only the human and automated gates affected by that correction. A Critical or High correction requires a new preview and exact-revision verification before the decision can be reconsidered.

## Release-decision rationale

**CONDITIONAL GO** remains appropriate because:

- accepted technical gates remain closed;
- no new Critical or High defect has been confirmed;
- all required human accessibility checks remain incomplete;
- all release-critical stakeholder approvals remain pending;
- retention, support ownership, scheduling, Meta Pixel, and duplicate handling remain undecided;
- merge and production authorization remain pending.

The status may advance to **READY FOR EXPLICIT MERGE AND PRODUCTION AUTHORIZATION** only after all required human reviews and stakeholder decisions are complete, and all Moderate or Low issues are corrected or explicitly accepted. That status still would not authorize a merge or production deployment.

## Merge and deployment restrictions

- Do not merge Pull Request #8.
- Do not convert Pull Request #8 from draft.
- Do not deploy production.
- Do not alter the production Netlify site.
- Do not enable Meta Pixel.
- Do not change production scheduling.

Two separate explicit instructions remain mandatory:

1. authorization to merge Pull Request #8;
2. authorization to deploy an identified approved revision to production.

## Recommended owner actions

1. Assign the five human-review environments listed in the accessibility review document.
2. Complete and evidence the 59 human checks without converting unavailable checks to passes.
3. Record every FAIL or PARTIAL result in the defect register and apply severity rules.
4. Route the approval register to the designated business, provider/product, legal/privacy, compliance, recruitment, support, operations, and release approvers.
5. Approve exact retention and deletion rules for every record category.
6. Record explicit scheduling, Meta Pixel, and duplicate-handling decisions.
7. Keep Pull Request #8 draft until the complete evidence package supports a separate merge decision.

## Production and Operations Hub confirmation

Production `main` remains unchanged at `e9853d2d080f684dcb1e361856fe0a377224055e`. No production deployment occurred.

> **The Avodah Operations Hub repository remains read-only. Operations Hub implementation work must wait until UAT-04 and all other active maintenance have been completed, the repository and TEST deployment have been confirmed stable, and the integration work has received separate approval.**
