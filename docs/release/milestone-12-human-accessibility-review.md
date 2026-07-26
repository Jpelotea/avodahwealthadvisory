# Milestone 12 Human Accessibility Review

**Status:** Prepared for genuine human review — no human result has been inferred from automation.

**Prepared:** July 26, 2026  
**Release state:** CONDITIONAL GO  
**Pull Request:** [#8](https://github.com/Jpelotea/avodahwealthadvisory/pull/8) — open, draft, and unmerged

## Accepted technical baseline

Milestone 11A remains accepted as technically complete. Its Forms, schema, consent, synthetic-submission, cleanup, browser-automation, Lighthouse, consent-network, and CodeQL gates must not be reopened without new regression evidence.

- Accepted branch before this documentation: `agent/blueprint-foundation`
- Accepted Milestone 11A head: `a1061b14f486c474668c3bee279379df4a5e63d1`
- Production `main`: `e9853d2d080f684dcb1e361856fe0a377224055e`
- Active scheduling: `30/30/30`
- Production deployment: not performed

## Human-review target

| Item | Review target |
|---|---|
| Preview URL | https://deploy-preview-8--avodahwealthadvisory.netlify.app |
| Immutable deployment | https://6a645172fbef1d00086b76c0--avodahwealthadvisory.netlify.app |
| Netlify Deploy ID | `6a645172fbef1d00086b76c0` |
| Deployment context | `deploy-preview` |
| Branch | `agent/blueprint-foundation` |
| Public website source revision | `e79e4f6fa6505b585c8fe17177db26adf4fb72eb` |
| Current branch relationship | Later commits changed Forms test infrastructure, workflow gates, and release documentation; no public website HTML, CSS, shared public JavaScript, route, or production configuration changed after the accepted public-source revision. |
| Accepted browser baseline | Milestone 10 browser evidence at public revision `e79e4f6fa6505b585c8fe17177db26adf4fb72eb` |
| Indexing protection | Deploy-preview responses add both `<meta name="robots" content="noindex,nofollow,noarchive">` and `X-Robots-Tag: noindex, nofollow, noarchive`. |
| Production website? | No. This target is a Netlify deploy preview and immutable deploy-preview URL. |

The deploy preview is the appropriate review target because no later commit changed public browser-facing source. Creating or deploying another public preview solely for documentation is unnecessary and is not authorized.

## Human-review evidence rules

A row may be changed to **PASS**, **FAIL**, **PARTIAL**, or **NOT APPLICABLE** only after an actual human reviewer performs the check. Automated tests, source inspection, screenshots from prior automation, and AI interpretation cannot change a human-review result.

Every completed row must identify:

- reviewer name or assigned role;
- actual date and time;
- operating system and version;
- device;
- browser and version;
- assistive technology and version where applicable;
- exact route and condition;
- evidence link or issue reference;
- observed user impact;
- recommended action.

## Reviewer and environment register

| Environment ID | Required reviewer | OS and device | Browser or assistive technology | Assigned person | Actual review date | Status |
|---|---|---|---|---|---|---|
| ENV-CHROMIUM | Human desktop accessibility reviewer | Desktop or laptop; OS/version to be recorded | Chrome or Chromium; version to be recorded | Unassigned | — | NOT TESTED |
| ENV-FIREFOX | Human Firefox accessibility reviewer | Desktop or laptop; OS/version to be recorded | Firefox; version to be recorded | Unassigned | — | NOT TESTED |
| ENV-NVDA | Human screen-reader reviewer | Windows desktop or laptop | NVDA with Chrome or Firefox; versions to be recorded | Unassigned | — | NOT TESTED |
| ENV-VOICEOVER | Human Apple screen-reader reviewer, when suitable equipment is available | macOS, iPhone, or iPad; model/version to be recorded | VoiceOver with Safari | Unassigned | — | NOT TESTED |
| ENV-MOBILE | Human mobile accessibility reviewer | Physical phone or tablet preferred; model/OS to be recorded | Mobile Safari or Chrome; version to be recorded | Unassigned | — | NOT TESTED |

## Human accessibility results matrix

Statuses are restricted to **PASS**, **FAIL**, **PARTIAL**, **NOT TESTED**, and **NOT APPLICABLE**.

### A. Chromium browser zoom and reflow

| Check ID | Route | Browser or AT | Condition | Reviewer | Result | Severity | Evidence | Required action |
|---|---|---|---|---|---|---|---|---|
| ZC-01 | `/` | Chromium desktop | 100%, 200%, and 400% zoom; homepage, cards, navigation, dense text | Unassigned | NOT TESTED | — | Pending | Assign human reviewer and record each zoom result. |
| ZC-02 | `/consultation/` | Chromium desktop | 100%, 200%, and 400%; Client Needs Check and consultation workflow | Unassigned | NOT TESTED | — | Pending | Verify labels, consent, controls, validation, and confirmation readability. |
| ZC-03 | `/client-support/` | Chromium desktop | 100%, 200%, and 400%; support form | Unassigned | NOT TESTED | — | Pending | Verify no clipping, horizontal reading scroll, or inaccessible control. |
| ZC-04 | `/careers/apply/` | Chromium desktop | 100%, 200%, and 400%; recruitment form | Unassigned | NOT TESTED | — | Pending | Verify long labels, consent, and application controls. |
| ZC-05 | `/contact/` | Chromium desktop | 100%, 200%, and 400%; general inquiry form | Unassigned | NOT TESTED | — | Pending | Verify errors, entered-value retention, and confirmation state. |
| ZC-06 | `/privacy/` | Chromium desktop | 100%, 200%, and 400%; dense legal/privacy text | Unassigned | NOT TESTED | — | Pending | Verify readable reflow and no clipped legal content. |
| ZC-07 | `/services/` | Chromium desktop | 100%, 200%, and 400%; cards and long navigation | Unassigned | NOT TESTED | — | Pending | Verify cards, links, headings, and controls reflow. |
| ZC-08 | `/careers/` | Chromium desktop | 100%, 200%, and 400%; recruitment cards and calls to action | Unassigned | NOT TESTED | — | Pending | Verify readable reflow and operable controls. |

### B. Firefox zoom and reflow

| Check ID | Route | Browser or AT | Condition | Reviewer | Result | Severity | Evidence | Required action |
|---|---|---|---|---|---|---|---|---|
| ZF-01 | `/` | Firefox desktop | 100%, 200%, and 400% | Unassigned | NOT TESTED | — | Pending | Perform independently from Chromium and record Firefox differences. |
| ZF-02 | `/consultation/` | Firefox desktop | 100%, 200%, and 400% | Unassigned | NOT TESTED | — | Pending | Verify complete consultation and Client Needs Check reflow. |
| ZF-03 | `/client-support/` | Firefox desktop | 100%, 200%, and 400% | Unassigned | NOT TESTED | — | Pending | Verify form labels, errors, consent, and controls. |
| ZF-04 | `/careers/apply/` | Firefox desktop | 100%, 200%, and 400% | Unassigned | NOT TESTED | — | Pending | Verify recruitment form reflow and focus visibility. |
| ZF-05 | `/contact/` | Firefox desktop | 100%, 200%, and 400% | Unassigned | NOT TESTED | — | Pending | Verify inquiry form and confirmation behavior. |
| ZF-06 | `/privacy/` | Firefox desktop | 100%, 200%, and 400% | Unassigned | NOT TESTED | — | Pending | Verify dense text and links reflow correctly. |
| ZF-07 | `/services/` | Firefox desktop | 100%, 200%, and 400% | Unassigned | NOT TESTED | — | Pending | Record Firefox-specific layout or focus differences. |
| ZF-08 | `/careers/` | Firefox desktop | 100%, 200%, and 400% | Unassigned | NOT TESTED | — | Pending | Verify cards, calls to action, and responsive navigation. |

### C. Screen-reader review

| Check ID | Route | Browser or AT | Condition | Reviewer | Result | Severity | Evidence | Required action |
|---|---|---|---|---|---|---|---|---|
| SR-01 | `/` | NVDA with Chrome or Firefox | Title, landmarks, headings, navigation, decorative and informative images | Unassigned | NOT TESTED | — | Pending | Assign experienced NVDA reviewer. |
| SR-02 | `/consultation/` | NVDA with Chrome or Firefox | Labels, required state, processing versus marketing consent, validation, success | Unassigned | NOT TESTED | — | Pending | Complete form with both marketing choices and invalid-input cases. |
| SR-03 | `/client-support/` | NVDA with Chrome or Firefox | Labels, errors, required fields, consent, confirmation | Unassigned | NOT TESTED | — | Pending | Record announcements and focus behavior. |
| SR-04 | `/careers/apply/` | NVDA with Chrome or Firefox | Application form, required fields, consent, confirmation wording | Unassigned | NOT TESTED | — | Pending | Verify applicant workflow without visual dependence. |
| SR-05 | `/contact/` | NVDA with Chrome or Firefox | General inquiry form, errors, submission success | Unassigned | NOT TESTED | — | Pending | Verify meaningful names and understandable error recovery. |
| SR-06 | Site-wide responsive navigation | NVDA with responsive browser | Mobile-menu expanded/collapsed announcement and link names | Unassigned | NOT TESTED | — | Pending | Verify menu state and focus return. |
| SR-07 | `/privacy/` | NVDA with Chrome or Firefox | Heading hierarchy, links, privacy contact details | Unassigned | NOT TESTED | — | Pending | Verify logical reading order and understandable disclosures. |
| SR-08 | Representative routes above | VoiceOver with Safari | Equivalent title, landmark, form, menu, and confirmation review | Unassigned | NOT TESTED | — | Pending | Complete when suitable Apple device and reviewer are available; otherwise retain NOT TESTED. |

### D. Keyboard-only consultation workflow

| Check ID | Route | Browser or AT | Condition | Reviewer | Result | Severity | Evidence | Required action |
|---|---|---|---|---|---|---|---|---|
| KB-01 | `/consultation/` through confirmation | Keyboard only | Skip link; logical focus; all fields; dropdowns; separate consent choices; validation; submit; confirmation; no trap or lost focus | Unassigned | NOT TESTED | — | Pending | Complete entire workflow without mouse or touch input. |

### E. Mobile-menu keyboard interaction

| Check ID | Route | Browser or AT | Condition | Reviewer | Result | Severity | Evidence | Required action |
|---|---|---|---|---|---|---|---|---|
| MM-01 | Site-wide responsive header | Keyboard in responsive desktop environment | Open, close, Escape, focus placement/containment, return to trigger, link navigation, state announcement, background restriction | Unassigned | NOT TESTED | — | Pending | Record each interaction and any focus escape. |

### F. Form-error usability

| Check ID | Route | Browser or AT | Condition | Reviewer | Result | Severity | Evidence | Required action |
|---|---|---|---|---|---|---|---|---|
| FE-01 | `/consultation/` | Human visual and keyboard review | Submit missing required Client Needs Check information | Unassigned | NOT TESTED | — | Pending | Verify associated error, visible indicator, focus, retained values, and mobile discoverability. |
| FE-02 | `/consultation/` | Human visual and keyboard review | Omit processing consent while marketing is accepted or declined | Unassigned | NOT TESTED | — | Pending | Confirm processing error is distinct and marketing decline is not an error. |
| FE-03 | `/client-support/` | Human visual and keyboard review | Submit incomplete support request | Unassigned | NOT TESTED | — | Pending | Verify understandable recovery and retained values. |
| FE-04 | `/careers/apply/` | Human visual and keyboard review | Submit incomplete recruitment application | Unassigned | NOT TESTED | — | Pending | Verify errors identify fields without implying rejection. |
| FE-05 | `/contact/` | Human visual and keyboard review | Submit incomplete general inquiry | Unassigned | NOT TESTED | — | Pending | Verify error association, focus, color independence, and mobile exposure. |

### G. Visible focus

| Check ID | Route or component | Browser or AT | Condition | Reviewer | Result | Severity | Evidence | Required action |
|---|---|---|---|---|---|---|---|---|
| VF-01 | Site-wide navigation links | Keyboard | Default and responsive layouts | Unassigned | NOT TESTED | — | Pending | Record hidden, clipped, obscured, or low-contrast focus. |
| VF-02 | Menu trigger and drawer controls | Keyboard | Closed and open states | Unassigned | NOT TESTED | — | Pending | Verify trigger, close control, and contained links. |
| VF-03 | Primary and secondary buttons | Keyboard | Homepage and workflow routes | Unassigned | NOT TESTED | — | Pending | Verify focus is visible over every background. |
| VF-04 | Text links and card links | Keyboard | Services, careers, privacy, and footer | Unassigned | NOT TESTED | — | Pending | Verify links inside cards and dense text. |
| VF-05 | Text inputs and textareas | Keyboard | All public forms | Unassigned | NOT TESTED | — | Pending | Verify focus boundary is not clipped by containers. |
| VF-06 | Checkboxes and consent controls | Keyboard | Processing and marketing consent | Unassigned | NOT TESTED | — | Pending | Verify independent, visible focus and understandable labels. |
| VF-07 | Select controls | Keyboard | Consultation and support workflows | Unassigned | NOT TESTED | — | Pending | Verify native focus indicator remains visible. |
| VF-08 | Confirmation-page actions | Keyboard | All public confirmation routes | Unassigned | NOT TESTED | — | Pending | Verify return links and next actions have visible focus. |

### H. Text reflow edge cases

| Check ID | Route | Browser or AT | Condition | Reviewer | Result | Severity | Evidence | Required action |
|---|---|---|---|---|---|---|---|---|
| RF-01 | `/consultation/` | Chromium and Firefox | Narrow layout plus 400% zoom | Unassigned | NOT TESTED | — | Pending | Check overlap, hidden labels, off-screen buttons, and consent truncation. |
| RF-02 | `/client-support/` | Chromium and Firefox | Narrow layout plus 400% zoom | Unassigned | NOT TESTED | — | Pending | Check fixed heights, error exposure, and horizontal reading scroll. |
| RF-03 | `/careers/apply/` | Chromium and Firefox | Narrow layout plus 400% zoom | Unassigned | NOT TESTED | — | Pending | Check long labels and applicant notices. |
| RF-04 | `/privacy/` | Chromium and Firefox | Narrow layout plus 400% zoom | Unassigned | NOT TESTED | — | Pending | Check legal text, headings, links, and footer overflow. |
| RF-05 | Responsive menu and confirmation states | Chromium and Firefox | Narrow layout plus zoom | Unassigned | NOT TESTED | — | Pending | Check drawer overflow and confirmation-message truncation. |

### I. Contrast edge cases

| Check ID | Component | Browser or AT | Condition | Reviewer | Result | Severity | Evidence | Required action |
|---|---|---|---|---|---|---|---|---|
| CT-01 | Text over hero images or gradients | Human visual review | Default, zoomed, and responsive states | Unassigned | NOT TESTED | — | Pending | Record foreground, background, and state. |
| CT-02 | Hover and active links | Human visual review | Header, cards, body, and footer | Unassigned | NOT TESTED | — | Pending | Verify state remains distinguishable. |
| CT-03 | Focus outlines | Human visual review | Light, dark, image, and card backgrounds | Unassigned | NOT TESTED | — | Pending | Verify sufficient visual distinction. |
| CT-04 | Disabled controls | Human visual review | Any disabled booking or form state | Unassigned | NOT TESTED | — | Pending | Verify readable but clearly disabled. |
| CT-05 | Placeholder text | Human visual review | All public forms | Unassigned | NOT TESTED | — | Pending | Confirm placeholder is readable and not relied on as label. |
| CT-06 | Error messages and status text | Human visual review | Invalid and confirmation states | Unassigned | NOT TESTED | — | Pending | Verify color is not the only indicator. |
| CT-07 | Consent descriptions and muted footer text | Human visual review | Desktop and mobile | Unassigned | NOT TESTED | — | Pending | Record any low-contrast or small-text concern. |
| CT-08 | Mobile navigation and button text | Human visual review | Open menu, primary/secondary buttons | Unassigned | NOT TESTED | — | Pending | Verify text remains readable in every state. |

### J. Touch targets

| Check ID | Component | Browser or AT | Condition | Reviewer | Result | Severity | Evidence | Required action |
|---|---|---|---|---|---|---|---|---|
| TT-01 | Mobile menu trigger and close behavior | Physical mobile or tablet | Portrait and landscape where supported | Unassigned | NOT TESTED | — | Pending | Verify activation without adjacent-control errors. |
| TT-02 | Primary and secondary buttons | Physical mobile or tablet | Homepage and workflow pages | Unassigned | NOT TESTED | — | Pending | Record difficult or overlapping targets. |
| TT-03 | Form controls and selects | Physical mobile or tablet | All public forms | Unassigned | NOT TESTED | — | Pending | Verify reliable activation and input. |
| TT-04 | Processing and marketing checkboxes | Physical mobile or tablet | Consent sections | Unassigned | NOT TESTED | — | Pending | Verify label tap area and independent selection. |
| TT-05 | Closely spaced body and card links | Physical mobile or tablet | Services and careers | Unassigned | NOT TESTED | — | Pending | Verify adjacent links are not triggered accidentally. |
| TT-06 | Footer links | Physical mobile or tablet | Narrow widths | Unassigned | NOT TESTED | — | Pending | Verify spacing and activation accuracy. |
| TT-07 | Confirmation-page actions | Physical mobile or tablet | All public confirmation routes | Unassigned | NOT TESTED | — | Pending | Verify next actions are easy to activate. |

## Current result summary

| Result | Count |
|---|---:|
| PASS | 0 |
| FAIL | 0 |
| PARTIAL | 0 |
| NOT TESTED | 59 |
| NOT APPLICABLE | 0 |

No accessibility defect is confirmed by this document. An unavailable or unassigned human check remains **NOT TESTED** and is a release blocker for final explicit authorization, not evidence of failure or success.

## Defect escalation

When a reviewer records **FAIL** or **PARTIAL**, create an entry in `milestone-12-open-defects.md`. Any confirmed Critical or High defect returns the release decision to **NO-GO**. Public-source correction requires a separate commit, new preview, affected human retest, and only the regression suites relevant to the changed source.

## Operations Hub hold

> **The Avodah Operations Hub repository remains read-only. Operations Hub implementation work must wait until UAT-04 and all other active maintenance have been completed, the repository and TEST deployment have been confirmed stable, and the integration work has received separate approval.**
