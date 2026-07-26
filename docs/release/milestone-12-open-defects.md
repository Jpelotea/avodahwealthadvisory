# Milestone 12 Accessibility Defects and Review Gaps

**Prepared:** July 26, 2026  
**Current release decision:** CONDITIONAL GO  
**Pull Request:** [#8](https://github.com/Jpelotea/avodahwealthadvisory/pull/8) — open, draft, and unmerged

## Current defect status

No human accessibility defect has been confirmed because no required human accessibility check has yet been completed by an assigned reviewer.

This statement is not an accessibility pass. The 59 required checks in `milestone-12-human-accessibility-review.md` remain **NOT TESTED**. Unperformed checks are review blockers for final release authorization, but they must not be mislabeled as software defects until actual reviewer evidence identifies a problem.

## Confirmed defect register

| Defect ID | Route | Component | User impact | Severity | Reproduction steps | Proposed correction | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| — | — | — | No confirmed human-review defect recorded | — | — | — | — | None recorded |

## Open human-review gaps

| Gap ID | Required review | Current status | Owner action |
|---|---|---|---|
| GAP-01 | Chromium 100%, 200%, and 400% zoom and reflow | NOT TESTED | Assign human desktop reviewer and attach route-by-route evidence. |
| GAP-02 | Independent Firefox zoom and reflow review | NOT TESTED | Assign Firefox reviewer and record browser-specific differences. |
| GAP-03 | NVDA screen-reader review | NOT TESTED | Assign experienced Windows screen-reader reviewer. |
| GAP-04 | VoiceOver with Safari, when suitable reviewer and device are available | NOT TESTED | Assign Apple reviewer or retain NOT TESTED with availability explanation. |
| GAP-05 | Keyboard-only consultation workflow | NOT TESTED | Complete the core workflow without mouse or touch input. |
| GAP-06 | Mobile-menu keyboard interaction | NOT TESTED | Test open, close, Escape, focus containment, state announcement, and return focus. |
| GAP-07 | Public-form error usability | NOT TESTED | Intentionally submit invalid information on each public workflow. |
| GAP-08 | Visible-focus review | NOT TESTED | Review all interactive component groups in default and responsive layouts. |
| GAP-09 | Narrow-layout and 400% text reflow edge cases | NOT TESTED | Record overlap, clipping, fixed-height, overflow, and horizontal-scroll results. |
| GAP-10 | Human contrast edge-case review | NOT TESTED | Review image/gradient text, states, placeholders, errors, consent, footer, and navigation. |
| GAP-11 | Mobile touch-target review | NOT TESTED | Use a physical mobile or tablet where possible and record difficult adjacent targets. |

## Defect intake template

For each human result marked **FAIL** or **PARTIAL**, append a defect record using:

| Field | Required content |
|---|---|
| Defect ID | Stable `M12-A11Y-###` identifier |
| Route | Exact preview route |
| Component | Specific component and state |
| User impact | Concrete accessibility impact |
| Severity | Critical, High, Moderate, Low, or Advisory |
| Reproduction steps | Exact human steps, zoom, browser/AT, and viewport |
| Proposed correction | Smallest safe correction or acceptance decision |
| Owner | Assigned correction or decision owner |
| Status | Open, In Progress, Fixed Pending Retest, Accepted, Deferred, or Closed |
| Evidence | Screenshot, recording, notes, or issue link |

## Severity and release rules

### Critical

Use when the issue creates a complete core-workflow failure or a serious legal/privacy misunderstanding, including:

- keyboard trap;
- complete screen-reader workflow block;
- required consent cannot be understood or selected;
- essential content is unavailable;
- confirmation or validation creates a materially false or harmful outcome.

**Release effect:** immediate **NO-GO**.

### High

Use when the issue blocks a core task for a substantial user group, including:

- core workflow cannot be completed by keyboard;
- required field cannot be identified by a screen reader;
- validation is unusable;
- required content is hidden at 200% or 400% zoom;
- critical navigation cannot be operated.

**Release effect:** immediate **NO-GO**.

### Moderate

Use when a task remains possible but is materially difficult or confusing. Requires explicit correction, acceptance, or deferral before final release readiness.

### Low

Use for limited usability degradation that does not block a workflow. Requires an explicit correction, acceptance, or deferral decision.

### Advisory

Use for a documented improvement opportunity without a confirmed access barrier.

## Correction workflow

When a Critical or High defect is confirmed:

1. change the release decision to **NO-GO**;
2. preserve the human evidence and create the defect record;
3. apply only the smallest safe public-source correction after documentation;
4. commit the correction separately from Milestone 12 documentation;
5. create a new deploy preview without deploying production;
6. verify the exact revision and immutable preview;
7. rerun the affected human checks;
8. rerun only the automated browser, accessibility, consent, CSP, Forms, or other gates affected by the changed source;
9. keep Pull Request #8 draft and unmerged.

Moderate and Low issues require an explicit acceptance, correction, or deferral decision. No new server-side submission architecture or Operations Hub change is authorized by this process.

## Public-source corrections

**Current status:** None.

Milestone 12 preparation changed documentation only. No public website HTML, CSS, client JavaScript, route, form behavior, consent behavior, Function, Edge Function, scheduling setting, production Netlify configuration, or Operations Hub source was changed.

## Regression testing

**Current requirement:** No automated regression rerun is required for the documentation-only change.

The accepted Milestone 10 and Milestone 11A evidence remains valid. New automated testing becomes necessary only if an approved correction changes source covered by those gates.

## Operations Hub hold

> **The Avodah Operations Hub repository remains read-only. Operations Hub implementation work must wait until UAT-04 and all other active maintenance have been completed, the repository and TEST deployment have been confirmed stable, and the integration work has received separate approval.**
