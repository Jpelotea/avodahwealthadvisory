// REVIEW-ONLY PATCH: not deployed to Google Apps Script.
// Insert these helpers near the existing booking configuration helpers, then pass
// normalizeScheduling_(payload.scheduling) into the availability and booking handlers.

function boundedInteger_(value, fallback, minimum, maximum) {
  var parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function normalizeScheduling_(candidate) {
  var input = candidate && typeof candidate === 'object' ? candidate : {};
  return {
    duration_minutes: boundedInteger_(input.duration_minutes, 30, 15, 180),
    buffer_before_minutes: boundedInteger_(input.buffer_before_minutes, 30, 0, 180),
    buffer_after_minutes: boundedInteger_(input.buffer_after_minutes, 30, 0, 180),
    min_notice_hours: boundedInteger_(input.min_notice_hours, 0, 0, 168),
    max_advance_days: boundedInteger_(input.max_advance_days, 30, 1, 365)
  };
}

// In doPost(e), after parsing and authenticating the existing payload:
// var scheduling = normalizeScheduling_(payload.scheduling);
// if (payload.action === 'availability') return availabilityResponse_(payload, scheduling);
// if (payload.action === 'book') return bookingResponse_(payload, scheduling);

// Replace hard-coded duration/buffer values in availability calculations with:
// scheduling.duration_minutes
// scheduling.buffer_before_minutes
// scheduling.buffer_after_minutes
// scheduling.min_notice_hours
// scheduling.max_advance_days

// Keep existing handler signatures backward compatible:
// function availabilityResponse_(payload, scheduling) {
//   scheduling = scheduling || normalizeScheduling_({});
//   ...existing implementation...
// }
// function bookingResponse_(payload, scheduling) {
//   scheduling = scheduling || normalizeScheduling_({});
//   ...existing implementation...
// }

// Return the effective values with availability responses so the website can display
// the server-approved duration and buffers. Never return secrets.
