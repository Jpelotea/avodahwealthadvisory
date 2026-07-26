# Milestone 12C Review Evidence and Remediation Plan

**Evidence ID:** `M12C-JC-2026-07-26`  
**Current release decision:** **CONDITIONAL GO**  
**Implementation status:** Not authorized  
**Pull Request:** [#8](https://github.com/Jpelotea/avodahwealthadvisory/pull/8) — open, draft, and unmerged

## Validated reviewer identity and environment

| Field | Recorded value |
|---|---|
| Reviewer | JC Pelotea |
| Reviewer role | Project Developer / Reviewer / Authorized Stakeholder |
| Review date | July 26, 2026; time not supplied |
| Device | Windows desktop |
| Operating system | Windows 11 |
| Browser | Google Chrome 150.0.7871.187 (Official Build), 64-bit |
| Assistive technology | None reported |
| Evidence type | Written reviewer observations; no screenshot or recording files supplied |

JC Pelotea is recorded as the reviewer for the submitted Chromium and functional observations only. This evidence does not establish JC as the formal legal, privacy, compliance, provider-wording, recruitment-compliance, data-retention, merge, or production-release approver.

The statement “Privacy is okay” is retained as informal reviewer feedback. It is not formal legal/privacy approval and does not prove that the privacy route completed a defined accessibility procedure.

## Exact review coverage accepted

The supplied evidence covers only:

- Google Chrome desktop on Windows 11;
- selected public routes at 100% zoom;
- the Services page at 200% zoom;
- basic successful form-submission observations;
- the visual, content, layout, and workflow feedback listed below.

No overall approval statement is converted into a PASS for an unreported procedure.

## Checks remaining NOT TESTED

- Chrome 400% review.
- Complete Chrome 200% route matrix beyond the reported Services observation.
- Firefox 100%, 200%, and 400%.
- NVDA.
- VoiceOver.
- Full keyboard-only consultation workflow.
- Responsive mobile-menu keyboard procedure.
- Physical mobile and touch-target review.
- Intentional invalid-form and form-error usability testing.
- Complete visible-focus matrix.
- Formal contrast measurements.
- Remaining route-specific reflow checks.

## Accepted Chromium observations

### Homepage — 100%

- `Start the Free 2-Minute Needs Check` was somewhat difficult to read. The text appeared too bold and letter spacing may need adjustment.
- Footer email `avodahwealthadvisory@gmail.com` overlapped another element or exceeded available space.
- Navigation worked in the observed interaction.
- Header `Start Consultation` CTA became unreadable on hover.
- Form labels were visible.
- Native dropdowns opened immediately without animation.
- `Additional Notes / Particular Request` should be optional.
- Consent checkboxes were understandable.
- No content was cut off.
- No unnecessary horizontal scrolling was observed.

The lack of dropdown animation is an **OPTIONAL UX ENHANCEMENT**, not an accessibility failure. Native select behavior should not be replaced solely to add animation when doing so could reduce keyboard or assistive-technology support.

### Consultation — 100%

- Font styling differed from other pages.
- Footer styling differed from other pages.
- Basic form submission succeeded.
- Dropdown controls opened without animation.

A successful submission alone is not a complete form-accessibility pass.

### Client Needs Check, General Inquiry, and Recruitment Application — 100%

- Fonts differed from the main website typography.
- Basic form submission succeeded.
- Confirmation-page Messenger wording was unclear.
- Confirmation pages should tell users to save their reference number.

Suggested Messenger labels are pending owner selection:

- `Message Us on Messenger`
- `Talk to Us on Messenger`
- `Continue on Messenger`

Proposed reference guidance is also pending approval:

> Please save your reference number. You may use it when following up about this submission.

This wording must not promise automated tracking or a personalized status function that does not exist.

### General Inquiry confirmation

Source identification confirmed:

- `Send Another Inquiry` points to `/general-inquiry.html`.
- `Contact Options` points to `/contact.html`.
- Both currently resolve to the same General Inquiry/contact workflow.

The action set is therefore provisionally redundant, but neither action will be removed until the owner selects the final action set.

### Recruitment Application — 100%

- The page states that secure résumé submission is not enabled.
- `Current occupation` should become `Current Employment Status`.
- Proposed employment options: Employed, Unemployed, Student, Other.
- Educational background should use a dropdown; the exact option list is not approved.
- Interview availability should include an example such as `Weekdays / 9:00 AM` and should be optional.
- Relevant experience should be optional.
- Reason for applying should be optional.
- `Review Process` should become `Application Process`.
- A proposed `View Application Status` button and status page are a new feature request.

No application-status feature will be described as available or implemented without a separate milestone covering secure authentication, an approved data source, privacy/security review, and implementation authorization. It must not connect to or modify the Operations Hub during this milestone.

### Services — 200%

**PARTIAL — reflow issue reported; detailed evidence pending.**

The following evidence is still required:

- affected card names and order;
- whether cards overlap;
- whether text is clipped;
- whether horizontal scrolling occurs;
- whether buttons become unavailable;
- viewport dimensions;
- screenshot filename or evidence link.

The full 200% Services check is not marked PASS.

## Provisional defect and change register

| ID | Route | Component | Issue or user impact | Provisional severity | Classification | Status | Required next action |
|---|---|---|---|---|---|---|---|
| A11Y-001 | Homepage / global header | `Start Consultation` CTA hover | Text becomes unreadable in hover state; exact colors not measured. | Moderate | ACCESSIBILITY CORRECTION | Evidence received; measurement and scope approval required | Measure foreground/background and correct only the affected interaction state. |
| A11Y-002 | Homepage; verify every route using shared footer | Footer email | Email overlaps or exceeds its container, impairing readability and reflow. | Moderate | ACCESSIBILITY CORRECTION | Evidence received; reproduction matrix pending | Verify desktop, narrow desktop, 200%, 400%, mobile, and long-word wrapping. |
| A11Y-003 | Homepage | `Start the Free 2-Minute Needs Check` CTA | Typography appears overly bold or tightly spaced and difficult to read. | Low–Moderate | ACCESSIBILITY CORRECTION | Evidence received; typography evidence pending | Review weight and letter spacing without making the label too thin. |
| A11Y-004 | Services | Service-card layout at 200% | Arrangement reported unsuitable; exact overlap/order/clipping/scroll impact not supplied. | Moderate provisional | ACCESSIBILITY CORRECTION | PARTIAL; detailed evidence pending | Obtain screenshot, viewport, affected cards, and exact impact before code change. |
| FORM-001 | Homepage consultation form (`index.html`) | `Additional Notes / Particular Request` (`message`) | Business requirement says field should be optional; source currently marks it required. | Moderate | FORM REQUIREMENT CORRECTION | Affected field identified; owner approval required | Confirm optionality before changing label, validation, or schema. |
| UX-001 | Consultation, Client Needs Check, General Inquiry, Recruitment Application; verify Client Support separately | Typography | Form-page typography differs from the accepted site design. | Low | DESIGN CONSISTENCY CORRECTION | Evidence received; affected shared styles pending | Identify shared styles and approve exact consistency scope. |
| UX-002 | Consultation | Footer | Footer differs from shared footer used on other pages. | Low | DESIGN CONSISTENCY CORRECTION | Evidence received; structural comparison pending | Compare the shared shell/footer before correction. |
| CONTENT-001 | Applicable confirmation pages | Messenger action | Label does not clearly communicate that it opens the company Messenger. | Moderate | CONTENT CORRECTION | Owner copy selection required | Select final wording and verify destination on every applicable confirmation page. |
| CONTENT-002 | Confirmation pages displaying a reference | Reference guidance | Users are not told clearly to save or take note of the reference number. | Low | CONTENT CORRECTION | Proposed copy pending approval | Add approved follow-up wording without promising tracking/status functionality. |
| UX-003 | General Inquiry confirmation | Confirmation actions | `/general-inquiry.html` and `/contact.html` resolve to the same workflow, producing redundant actions. | Low | OPTIONAL UX ENHANCEMENT | Destinations verified; owner decision pending | Select the simplified action set before removal. |
| RECRUIT-001 | Recruitment Application | Résumé notice/capability | Secure résumé upload is unavailable; production requirement is undecided. | Stakeholder decision pending | STAKEHOLDER DECISION REQUIRED | Decision required | Choose revised notice, approved email process, separate secure-upload milestone, or removal of references. |
| RECRUIT-002 | Recruitment Application | Labels, dropdowns, examples, optional fields | Requested Employment Status, educational dropdown, interview example/optionality, optional experience/reason, and Application Process wording. | Moderate scoped requirement | FORM REQUIREMENT CORRECTION | Exact options/copy pending owner approval | Approve exact field options and copy before implementation. |
| RECRUIT-003 | Recruitment Application / future route | `View Application Status` | Requires a secure personalized status system and approved data source. | Future feature; not rated | NEW FEATURE REQUEST | Out of scope | Separate authorization, authentication, privacy, data-source, and security milestone required. |

No Critical or High defect is confirmed. Moderate and Low findings require an explicit correction, acceptance, or deferral decision.

## Evidence gaps

| Finding | Missing evidence |
|---|---|
| A11Y-001 | Hover foreground/background values, screenshot, and exact state measurement. |
| A11Y-002 | Viewport, exact overlap location, shared-footer route confirmation, 200%, 400%, mobile, and long-word evidence. |
| A11Y-003 | Screenshot plus computed font weight, size, line height, and letter spacing. |
| A11Y-004 | Affected cards, overlap/clipping/scroll/button details, viewport, and screenshot. |
| UX-001 / UX-002 | Exact before/after comparison and approved design reference. |
| CONTENT-001 | Current labels/destinations for each applicable confirmation page and owner-selected replacement. |
| RECRUIT-001 / RECRUIT-002 | Business requirement, privacy/retention implications, approved educational options, and explicit optionality decisions. |

## Items safe for a future approved remediation

The following are bounded enough for a future remediation scope, but **none is authorized yet**:

- A11Y-001 hover readability after measurement.
- A11Y-002 footer email wrapping/layout after reproduction.
- A11Y-003 CTA typography after design measurement.
- A11Y-004 Services reflow after detailed evidence.
- FORM-001 required-to-optional correction after explicit approval.
- UX-001 and UX-002 shared typography/footer consistency work.
- CONTENT-001 and CONTENT-002 approved copy changes.
- UX-003 confirmation action simplification after action selection.
- RECRUIT-002 approved recruitment label, option, example, and optionality changes.

## Items requiring separate approval

- Exact Educational Background options.
- Résumé submission process, security, retention, malware handling, and privacy scope.
- Messenger wording.
- Reference-number guidance.
- Optionality of Additional Notes, interview availability, relevant experience, and reason for applying.
- Any form schema or validation change.
- Any public wording with legal, privacy, compliance, provider, or recruitment implications.
- Any file-upload capability.

## Items excluded from this remediation

- RECRUIT-003 personalized application-status feature.
- Secure résumé upload implementation.
- New authentication or server-side submission architecture.
- Operations Hub integration or data source.
- Production scheduling changes.
- Meta Pixel activation.
- Pull Request merge or production deployment.

## Repository and test status

- Public website source changed: **No**.
- Form schema or required fields changed: **No**.
- New preview created: **No**.
- Regression tests run: **No**; none are required for evidence-intake documentation alone.
- Production `main`: unchanged at `e9853d2d080f684dcb1e361856fe0a377224055e`.
- Scheduling: unchanged at `30/30/30`.
- Meta Pixel: disabled.
- Pull Request #8: open, draft, and unmerged.

## Current release decision

**CONDITIONAL GO** remains appropriate because the technical baseline is closed, no Critical or High defect is confirmed, Moderate/Low findings need decisions, required human testing is incomplete, and formal stakeholder approvals remain pending.

Return to **NO-GO** if later evidence confirms a core-workflow access block, a Critical/High defect, a material legal/privacy/compliance/recruitment issue, or a required missing pre-production capability.

## Operations Hub hold

> **The Avodah Operations Hub repository remains read-only. Operations Hub implementation work must wait until UAT-04 and all other active maintenance have been completed, the repository and TEST deployment have been confirmed stable, and the integration work has received separate approval.**