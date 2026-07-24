# Website-to-Operations-Hub contract — read-only assessment

Assessment date: 2026-07-24

> **Proposed only — not applied while UAT-04 or other Operations Hub maintenance remains active. Separate approval is required before implementation.**

The Avodah Operations Hub repository was inspected only as a controlled TEST integration reference. No workflow, deployment, Apps Script operation, TEST submission, source edit, branch, commit, or pull request was created in that repository.

## Maintenance boundary

The inspected repository identifies itself as the controlled source and deployment entry point for the TEST Apps Script project, with production outside the workflow scope. The supplied UAT-04 commit is a trigger for TEST-only Reporting Month normalization maintenance. Its presence does not establish maintenance completion, test success, deployment stability, or integration readiness.

No Operations Hub implementation may begin until all maintenance-completion and separate-authorization conditions in the Milestone 4 directive are confirmed.

## Current integration contract

| Integration | Website endpoint / function | Method | Authentication | Confirmed request fields | Confirmed response / behavior | Compatibility state |
|---|---|---|---|---|---|---|
| Availability | `/api/booking-slots` → `booking-slots.mjs` | Website GET; Netlify-to-webhook POST | Webhook secret server-side | `action=availability`; website also sends `scheduling` | Hub availability source returns timezone, owner, duration, slot interval, before/after buffers, and dated slots | Core response compatible; `scheduling` consumption unverified |
| Booking | `/api/book-consultation` → `book-consultation.mjs` | POST | Webhook secret server-side in current website bridge; inspected Hub public portal also supports workflow-token claims | `lead_id`, `start`, `idempotency_key`; website also sends `scheduling` | Revalidates slot, calculates end from runtime duration, checks buffers/conflicts/blackouts, supports idempotent replay and active-booking duplicate handling | Core fields compatible; `scheduling` unsupported or unverified |
| Management status | `/api/manage-booking` → Hub management path | GET/POST depending website action | Management token; Hub stores a hash | Management token | Active booking status, booking ID, start, end, Meet link, timezone; inactive link returns gone/unavailable state | Compatible in principle; live test prohibited |
| Reschedule | `/api/manage-booking` | POST | Management token | `start`, management token | Revalidates rules, conflict checks, updates Calendar event, booking database, calendar log, and source links | Compatible in principle; live test prohibited |
| Cancellation | `/api/manage-booking` | POST | Management token | management token, optional reason | Removes Calendar event, updates booking state and related records; already-inactive behavior is idempotent | Compatible in principle; live test prohibited |
| Client-needs sync | `sync-client-needs.mjs` submission event | Netlify verified event → webhook POST | Netlify event plus server-side webhook secret | Existing 24-column row contract | Hub/Sheets webhook response `{ok, code, error}` expected | Existing production contract retained; new consent versions not yet mapped into dedicated Hub columns |
| Recovery record | Netlify Form `consultation-recovery` | POST to Netlify Forms | Same-origin form handling | lead ID, failure code/action, status, requested start, retryable, timestamp | Netlify record only; no automated Hub retry or administrator-notification guarantee | Website-only fallback confirmed |

## Scheduling compatibility assessment

The inspected Hub source uses one runtime configuration for availability, booking, and rescheduling. It:

- Calculates appointment end from `durationMinutes`.
- Applies `bufferBeforeMinutes` and `bufferAfterMinutes` to conflict checks.
- Validates booking rules before creation and rescheduling.
- Rechecks Calendar conflicts immediately before creating or moving an appointment.
- Prevents duplicate active bookings and supports idempotent replay.
- Returns the effective timezone, duration, interval, and buffers in availability responses.
- Uses the configured timezone when formatting slots and creating Calendar events.

The inspected public booking entry point maps workflow-token claims plus `start` and `idempotency_key` into booking creation. It does **not** show parsing of the website-supplied `scheduling` object. Therefore:

- Website environment variables are protected and useful as a proposed contract input.
- They must not be treated as the effective Hub scheduling rule today.
- The Hub runtime configuration remains the source of effective duration and buffer behavior.
- Availability and final booking appear internally consistent because both use the Hub runtime configuration.
- Minimum notice and maximum advance enforcement exist only to the extent implemented by the Hub’s current `validateBookingSlotRules_`; exact configured values require a later authorized inspection/test.

## Proposed payload contract

> **Proposed only — not applied while UAT-04 or other Operations Hub maintenance remains active. Separate approval is required before implementation.**

```json
{
  "action": "availability | book",
  "lead_id": "uuid for book",
  "start": "ISO-8601 for book",
  "idempotency_key": "bounded string for book",
  "scheduling": {
    "duration_minutes": 30,
    "buffer_before_minutes": 30,
    "buffer_after_minutes": 30,
    "min_notice_hours": 4,
    "max_advance_days": 30,
    "contract_version": "website-scheduling-v1"
  }
}
```

Proposed behavior:

1. Validate allowed integer ranges server-side.
2. Use Hub runtime values when the object is absent for backward compatibility.
3. Reject or ignore unsupported contract versions explicitly.
4. Return `effective_scheduling` so the website can show the actual rule.
5. Apply the same effective values to availability, final conflict checks, booking end time, and rescheduling.
6. Never allow a public client payload to override protected business configuration unless an approved server-to-server policy explicitly permits it.

Security recommendation: treat the website object as a requested profile or contract assertion, not as trusted public configuration. The Hub should compare it with protected Script Properties or an approved profile identifier.

## Proposed status and error vocabulary

| Internal code | Public-safe message | HTTP | Intake preserved | Booking exists | Follow-up | Retry automated | Notification complete | User may retry |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `INTAKE_ACCEPTED` | Your request was received. | 202/200 | Yes | No | Maybe | No | No | No |
| `BOOKING_CREATED` | Your appointment is confirmed. | 200 | Yes | Yes | No | No | Only if separately true | No |
| `ALREADY_BOOKED` / `IDEMPOTENT_REPLAY` | An existing appointment was found. | 200 | Yes | Yes | No | No | Unchanged | No |
| `SLOT_UNAVAILABLE` | That time is no longer available. | 409 | Yes | No | No | No | No | Yes |
| `MANUAL_FOLLOW_UP_REQUIRED` | Your request remains saved for manual follow-up. | 202/503 | Yes | No/unknown | Yes | No | No | Usually no full resubmission |
| `RECOVERY_RECORD_CREATED` | Your request remains saved for follow-up. | 202 | Yes | Unknown | Yes | No | No | No |
| `CALENDAR_CREATE_FAILED` | The appointment could not be confirmed. Your request remains saved. | 502 | Yes | No | Yes | No | No | Later, when advised |
| `MEET_CREATE_FAILED` | Meeting details are pending; the appointment status will be reviewed. | 502/207 | Yes | Depends on Calendar | Yes | No | No | No |
| `EMAIL_DELIVERY_FAILED` | Your appointment may exist, but email delivery was not confirmed. | 207/502 | Yes | Yes/unknown | Yes | No | No | No |
| `OPERATIONS_HUB_SYNC_FAILED` | Your appointment requires manual reconciliation. | 207/500 | Yes | Yes/unknown | Yes | No | No | No |
| `NOTIFICATION_PENDING` | Manual follow-up is required. | 202 | Yes | Unknown | Yes | No | No | No |
| `BOOKING_CANCELLED` | Your appointment was cancelled. | 200 | Yes | No active booking | No | No | Only if separately true | No |
| `RESCHEDULING_REQUIRED` | Choose another available time. | 409 | Yes | Existing/unknown | No | No | No | Yes |
| `INVALID_REQUEST` | The request could not be processed. | 400 | Depends | No | No | No | No | After correction |
| `UNAUTHORIZED_REQUEST` | This request is not authorized. | 401/403 | Unknown | Unknown | No | No | No | No |
| `TEMPORARY_INTEGRATION_FAILURE` | The service is temporarily unavailable. Your accepted intake remains saved where confirmed. | 503 | As reported | Unknown | Yes | No | No | Later |

Public claims must be driven by explicit result flags. Never state administrator notification, automatic retry, confirmed Calendar, created Meet, or synchronized Hub status unless the corresponding operation succeeded.

## Proposed workflow data mapping

### Consultation

| Website field | Proposed destination | Current compatibility |
|---|---|---|
| Website reference / lead ID | Lead and intake identifiers | Existing |
| Contact fields | Lead/intake record | Existing 24-column sync |
| Financial concern / service path | Intake need fields | Existing |
| Preferred contact and schedule | Intake fields | Existing |
| Processing-consent version and timestamp | Dedicated consent audit fields | Not supported in current 24-column row; proposal only |
| Optional marketing preference/version | Dedicated marketing consent fields | Not supported in current 24-column row; proposal only |
| Campaign attribution | Attribution/audit field | Existing serialized payload |
| Appointment start/end | Booking Database and Calendar Log | Existing booking flow |
| Calendar event ID / Meet status | Booking Database | Existing booking flow |
| Assigned owner | Protected runtime config / Hub record | Existing or runtime-derived |
| Recovery state | Booking Issues or dedicated recovery record | Partial; website Netlify recovery currently separate |

### Client support

No confirmed dedicated compatible Hub support module was established from the inspected contract. Temporary recommendation: Netlify Forms is the source of truth, with approved manual routing. Do not force support descriptions into an unrelated lead or booking sheet.

### Recruitment

The wider Hub context may contain applicant tracking, but no authorized live contract was confirmed during this read-only review. Temporary recommendation: Netlify Forms is the source of truth until a dedicated applicant schema, owner, retention period, and TEST integration are approved. Resume upload remains disabled.

### General inquiry

Temporary recommendation: Netlify Forms is the source of truth with approved email/manual review. Add a Hub module only after ownership and deduplication rules are approved.

## Proposed source-of-truth register

| Workflow stage | Proposed source of truth | Secondary record | Failure fallback | Approval needed |
|---|---|---|---|---:|
| Consultation intake | Approved Hub lead/intake record after successful sync | Netlify Form | Recovery record and manual reconciliation | Yes |
| Confirmed appointment | Google Calendar event | Hub Booking Database and Calendar Log | Booking Issue / manual reconciliation | Yes |
| Client support | Approved support store; Netlify Form initially | Notification/manual assignment | Manual routing | Yes |
| Recruitment | Approved applicant log; Netlify Form initially | Notification record | Manual review | Yes |
| General inquiry | Netlify Form initially | Approved email notification | Manual review | Yes |

Google Calendar, Netlify Forms, Google Sheets, and the Operations Hub are not equally authoritative. A Calendar event is authoritative for whether a confirmed appointment exists; an accepted intake record is authoritative for the original request; Hub records support workflow operations and reconciliation.

## Proposed regression tests

1. Legacy payload without `scheduling` retains current runtime defaults.
2. `30/30/30` profile returns identical availability and booking end/conflict behavior.
3. `45/15/15` profile remains inactive until approved, then uses identical values in availability, booking, and rescheduling.
4. Invalid negative, non-integer, excessive, or unknown-version values fall back or fail safely.
5. Slot becomes unavailable between lookup and booking → `409 SLOT_UNAVAILABLE` with intake preserved.
6. Same idempotency key → existing result, no duplicate Calendar event.
7. Existing active booking for lead → duplicate-safe result.
8. Calendar create failure → no confirmed-booking claim.
9. Database/log failure → verified rollback or reconciliation-required status.
10. Meet link absent → do not claim Meet creation.
11. Email flag false → do not claim email delivery.
12. Operations Hub link update failure → booking may exist, reconciliation clearly required.
13. Timezone remains `Asia/Manila` or the separately approved protected timezone across slot labels, event start/end, and responses.

## Future deployment prerequisites

- UAT-04 completion, tests, manual-runner checks, diagnostics review, and no remaining correction.
- Confirmation that no other maintenance workflow or TEST deployment is active.
- Stable Hub `main` commit and TEST deployment version recorded.
- Rollback commit/deployment recorded.
- Separate approval for an integration branch.
- Separate approval for Apps Script modification and deployment.
- Approved scheduling profile and contract version.
- Approved test identities and test Calendar.
- Backward-compatibility and security review.
- Controlled TEST integration plan that avoids real personal data.

## Proposed rollback procedure for future authorized work

No Hub rollback is required for Milestone 4 because no Hub change was made. For a future authorized change: restore the recorded stable source commit, redeploy the recorded stable TEST Apps Script version, verify protected Script Properties without exposing values, run availability/booking/management smoke tests with approved synthetic identities, and document reconciliation for any test records.

## Operational hold notice

> **The Avodah Operations Hub repository was used only as a read-only integration reference during Milestone 4. No branch, source file, workflow, deployment, Script Property, Apps Script version, or TEST record was created or modified. Operations Hub implementation work must wait until UAT-04 and all other active maintenance have been completed, the repository and TEST deployment are confirmed stable, and the integration work has received separate approval.**
