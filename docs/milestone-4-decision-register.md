# Milestone 4 business and compliance decision register

Assessment date: 2026-07-24

| Decision | Current state | Classification | Production impact | Required approval / next action |
|---|---|---|---|---|
| Scheduling profile | Temporary `30/30/30` retained | Pending | Does not block preview; blocks final scheduling-policy sign-off | Select Option 1, 2, or 3 below |
| Public services and provider wording | Existing approved wording retained; no new guarantees added | Placeholder permitted | Review recommended before production | Business/legal content owner |
| Leadership and team content | Existing content retained | Pending | Does not block technical RC unless inaccurate | Business owner verification |
| Legal wording | Existing Privacy, Terms, and Disclaimer retained | Pending | May block production if legal review requires changes | Authorized legal/business reviewer |
| Privacy and consent wording | Processing and marketing separated; retention periods not finalized | Pending | Retention decision may block production | Privacy/business owner |
| Data retention periods | Not specified for consultation, support, recruitment, and inquiries | Pending | Blocks final privacy operations approval | Approve retention and deletion schedule |
| Client-support owner | Placeholder/manual routing | Pending | Blocks operational launch of support form | Name owner/escalation route |
| Client-support response-time language | No commitment published | Placeholder permitted | Does not block technical RC; blocks SLA wording | Approve realistic response window |
| Recruitment classification | No employment classification promised | Pending | Blocks detailed recruitment claims | Authorized recruitment/business review |
| Compensation and allowance wording | Not published | Rejected until authorized | Does not block current RC | Exact authorized wording required before publication |
| Meta Pixel | Disabled | Pending / currently rejected | Does not block production | Explicit approval required to enable |
| Operations Hub integration timing | On hold during UAT-04 and other maintenance | Blocks Operations Hub implementation | Does not block website-only preview; may block integrated production release | Confirm all maintenance conditions and separately authorize integration |
| TEST integration authorization | Not granted | Blocks Operations Hub implementation | Blocks live cross-system TEST | Separate written authorization |
| Apps Script modification authorization | Not granted | Blocks Operations Hub implementation | Blocks scheduling-contract implementation | Separate written authorization |
| Website production merge | Not granted | Blocks production | Website remains preview only | Explicit merge/deploy approval after RC review |

## Scheduling decision

### Option 1 — Retain `30/30/30`

- Consultation duration: 30 minutes.
- Buffer before: 30 minutes.
- Buffer after: 30 minutes.
- Effect: shorter visitor conversation with a full hour of preparation/follow-up protection around each appointment.
- Capacity: each appointment occupies a 90-minute protected window when buffers do not overlap efficiently.
- Visitor expectation: concise, focused consultation.
- Operational benefit: greater preparation, overrun, documentation, and recovery space.

### Option 2 — Adopt `45/15/15`

- Consultation duration: 45 minutes.
- Buffer before: 15 minutes.
- Buffer after: 15 minutes.
- Proposed minimum notice: four hours.
- Proposed maximum advance period: 30 days.
- Effect: longer visitor conversation with smaller preparation/follow-up margins.
- Capacity: each appointment occupies a 75-minute protected window, potentially improving daily availability compared with `30/30/30` depending on slot interval and working hours.
- Visitor expectation: more comprehensive initial discussion.
- Operational risk: less recovery time after overruns or complex cases.

### Option 3 — Approve another configuration

Avodah may approve a different duration, before/after buffers, minimum notice, maximum advance period, slot interval, working hours, blackout rules, and appointment method. The approved values must be applied consistently to availability, final booking conflict checks, booking duration, and rescheduling.

The website release candidate does not activate Option 2 or any custom profile. The effective Operations Hub rule remains its protected runtime configuration until separately authorized implementation is completed.
