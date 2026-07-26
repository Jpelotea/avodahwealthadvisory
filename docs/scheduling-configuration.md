# Consultation scheduling configuration

Consultation scheduling is controlled only through Netlify runtime environment variables and forwarded server-to-server to the approved Google Sheets / Apps Script booking service. No configured values are embedded in public HTML or browser JavaScript.

## Environment variable names

- `CONSULTATION_DURATION_MINUTES`
- `CONSULTATION_BUFFER_BEFORE_MINUTES`
- `CONSULTATION_BUFFER_AFTER_MINUTES`
- `CONSULTATION_MIN_NOTICE_HOURS`
- `CONSULTATION_MAX_ADVANCE_DAYS`

## Temporary development defaults

When the duration or buffer variables are absent, the server-side compatibility defaults preserve the current working behavior: a 30-minute consultation with 30-minute buffers before and after. Minimum notice and maximum advance are forwarded only when explicitly configured, so the current Apps Script rules remain authoritative until approval.

## Approval-dependent blueprint profile

The blueprint candidate is a 45-minute consultation, 15-minute buffers before and after, four hours minimum notice, and a 30-day advance-booking window.

The final scheduling profile is a business approval decision. Values must be configured in Netlify for the appropriate branch or deployment context. Secrets, webhook credentials, and environment-specific values must not be committed or exposed to frontend code.
