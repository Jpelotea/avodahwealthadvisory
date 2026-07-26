# Analytics event contract

All analytics events are emitted through `analytics.js`. The module uses an event allowlist, a parameter allowlist, and a PII-key rejection guard. Events are sent only when analytics consent is granted.

| Event | Trigger | Permitted parameters |
|---|---|---|
| `consultation_form_started` | First consultation form interaction | workflow, status, page_path |
| `consultation_form_completed` | Netlify accepts consultation intake | workflow, status, page_path, campaign_source, campaign_medium, campaign_name |
| `consultation_booking_started` | Availability is requested | workflow, status, page_path |
| `consultation_booking_completed` | Booking endpoint confirms appointment or duplicate | workflow, status, page_path, meeting_method, duplicate_detected |
| `consultation_manual_followup` | Manual-follow-up state is recorded | workflow, status, page_path, retryable |
| `consultation_booking_failed` | Availability or booking fails | workflow, status, page_path, retryable |
| `client_support_started` | First support form interaction | workflow, status, page_path |
| `client_support_submitted` | Netlify accepts support request | workflow, status, page_path, support_category |
| `recruitment_application_started` | First recruitment form interaction | workflow, status, page_path |
| `recruitment_application_submitted` | Netlify accepts application | workflow, status, page_path, career_path |
| `general_inquiry_submitted` | Netlify accepts general inquiry | workflow, status, page_path, inquiry_category |
| `cookie_preferences_saved` | Visitor saves choices | workflow, status, page_path, analytics_enabled, marketing_enabled |

Prohibited analytics data includes names, email addresses, mobile numbers, Messenger details, free-text messages, policy or application references, resumes, appointment notes, lead identifiers, booking identifiers, and confirmation references.
