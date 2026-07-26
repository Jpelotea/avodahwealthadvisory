# Milestone 12C Owner Decision Form

**Purpose:** Approve or reject the consolidated remediation scope before any public-source change.  
**Current state:** No implementation authorized.  
**Release decision:** **CONDITIONAL GO**  
**Review evidence:** `M12C-JC-2026-07-26`

Complete every applicable selection and provide the decision-maker name/date. A selected option authorizes planning only unless the final scope approval section is also completed.

## Decision metadata

| Field | Owner response |
|---|---|
| Decision-maker name and role | |
| Decision date | |
| Evidence or approval reference | |
| Authorized remediation commit scope | |
| Items explicitly deferred | |

## A. Educational Background options

Approve one exact list.

### Proposed initial list

- High School Graduate
- Senior High School Graduate
- Vocational or Technical Graduate
- College Undergraduate
- College Graduate
- Postgraduate
- Other

Select one:

- [ ] APPROVE proposed list exactly.
- [ ] APPROVE WITH CHANGES — list exact choices below.
- [ ] KEEP current free-text field.
- [ ] DEFER decision.

**Approved choices / notes:**

## B. Résumé submission

Select one:

- [ ] Keep résumé upload unavailable and revise the notice.
- [ ] Require résumé submission through an approved email process.
- [ ] Scope secure résumé upload in a separate approved milestone.
- [ ] Remove all résumé-submission references.
- [ ] Decision pending.

**Approved wording, email destination, retention/privacy conditions, or separate-milestone owner:**

No file upload may be implemented in this remediation without security, retention, malware-handling, and privacy approval.

## C. Application status

Select one:

- [ ] Keep “Application Process” information only.
- [ ] Add a non-personalized process-information page in a separately approved scope.
- [ ] Scope a future secure personalized application-status feature.
- [ ] Remove the proposed status action.
- [ ] Decision pending.

A personalized lookup requires authentication, an approved data source, privacy/security review, and separate implementation authorization. It must not use or modify the Operations Hub in this milestone.

## D. Messenger button wording

Select one:

- [ ] `Message Us on Messenger`
- [ ] `Talk to Us on Messenger`
- [ ] `Continue on Messenger`
- [ ] Custom wording: ____________________
- [ ] Decision pending

**Apply to these confirmation pages:**

## E. Confirmation reference message

Proposed wording:

> Please save your reference number. You may use it when following up about this submission.

Select one:

- [ ] APPROVE exactly.
- [ ] APPROVE WITH CHANGES — provide final copy below.
- [ ] Do not add reference guidance.
- [ ] Decision pending.

**Final approved copy:**

This wording must not promise automated tracking, personalized status lookup, or another unavailable function.

## F. Form optionality

Record a separate decision for each field.

| Field | Make optional | Keep required | Not applicable | Decision pending | Notes |
|---|---|---|---|---|---|
| Homepage consultation: Additional Notes / Particular Request | [ ] | [ ] | [ ] | [ ] | |
| Recruitment: Interview availability | [ ] | [ ] | [ ] | [ ] | |
| Recruitment: Relevant experience | [ ] | [ ] | [ ] | [ ] | |
| Recruitment: Reason for applying | [ ] | [ ] | [ ] | [ ] | |

## G. Recruitment field copy

| Current/requested item | Approve | Revise | Defer | Final decision/copy |
|---|---|---|---|---|
| `Current occupation` → `Current Employment Status` | [ ] | [ ] | [ ] | |
| Employment options: Employed, Unemployed, Student, Other | [ ] | [ ] | [ ] | |
| Interview availability example: `Weekdays / 9:00 AM` | [ ] | [ ] | [ ] | |
| `Review Process` → `Application Process` | [ ] | [ ] | [ ] | |

## H. General Inquiry confirmation actions

Verified current destinations:

- `Send Another Inquiry` → `/general-inquiry.html`
- `Contact Options` → `/contact.html`
- Both resolve to the same current public inquiry workflow.

Select one:

- [ ] Keep `Send Another Inquiry`; remove `Contact Options`.
- [ ] Keep `Contact Options`; remove `Send Another Inquiry`.
- [ ] Keep both and revise labels to clarify distinct purposes.
- [ ] Replace with another approved action set: ____________________
- [ ] Decision pending.

## I. Remediation-scope approval

Select each item authorized for implementation:

- [ ] A11Y-001 Header CTA hover readability.
- [ ] A11Y-002 Footer email wrapping/layout.
- [ ] A11Y-003 Homepage CTA typography/readability.
- [ ] A11Y-004 Services card reflow after detailed evidence is supplied.
- [ ] FORM-001 Additional Notes optionality.
- [ ] UX-001 Shared form-page typography.
- [ ] UX-002 Consultation shared footer.
- [ ] CONTENT-001 Messenger action wording.
- [ ] CONTENT-002 Reference-number guidance.
- [ ] UX-003 General Inquiry confirmation action simplification.
- [ ] RECRUIT-002 Approved recruitment field/copy changes.
- [ ] No remediation authorized yet.

## J. Required evidence before implementation

- [ ] A11Y-001 hover screenshot/color values received.
- [ ] A11Y-002 overlap screenshot and viewport received.
- [ ] A11Y-003 typography evidence received.
- [ ] A11Y-004 Services 200% screenshot, viewport, and affected cards received.
- [ ] Final approved copy and field decisions recorded.
- [ ] Legal/privacy/compliance review identified where affected.
- [ ] Regression-test scope accepted.

## Excluded unless separately authorized

- Personalized application-status system.
- Secure résumé upload.
- New authentication or server-side submission architecture.
- Operations Hub connection.
- Production deployment.
- PR merge.
- Scheduling change.
- Meta Pixel activation.

## Operations Hub hold

> **The Avodah Operations Hub repository remains read-only. Operations Hub implementation work must wait until UAT-04 and all other active maintenance have been completed, the repository and TEST deployment have been confirmed stable, and the integration work has received separate approval.**