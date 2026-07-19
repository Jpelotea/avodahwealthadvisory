const SPREADSHEET_ID = "1n1N3p8-xqWY6OHuEvlsWvTgWyRDVAOYULQgUdc0D3yU";
const LEADS_SHEET_NAME = "Intake Submissions";
const CALENDAR_LOG_SHEET_NAME = "Calendar Log";
const SETTINGS_SHEET_NAME = "Targets & Settings";
const BOOKING_SETTINGS_RANGE = "U3:V14";

function doPost(e) {
  const lock = LockService.getScriptLock();
  let hasLock = false;

  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const expectedSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");

    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse_({ ok: false, error: "Unauthorized" });
    }

    if (payload.action === "availability") {
      return jsonResponse_(getAvailability_());
    }

    if (payload.action === "book") {
      lock.waitLock(15000);
      hasLock = true;
      return jsonResponse_(bookConsultation_(payload));
    }

    if (!Array.isArray(payload.row) || payload.row.length !== 24) {
      return jsonResponse_({ ok: false, error: "Invalid row" });
    }

    lock.waitLock(10000);
    hasLock = true;
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LEADS_SHEET_NAME);
    if (!sheet) throw new Error("Intake Submissions sheet was not found.");

    sheet.appendRow(payload.row.map(safeCell_));
    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: "Unable to process request" });
  } finally {
    if (hasLock && lock.hasLock()) lock.releaseLock();
  }
}

function getBookingConfig_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const settingsSheet = spreadsheet.getSheetByName(SETTINGS_SHEET_NAME);
  if (!settingsSheet) throw new Error("Targets & Settings sheet was not found.");

  const values = settingsSheet.getRange(BOOKING_SETTINGS_RANGE).getDisplayValues();
  const map = {};
  values.forEach(function(row) {
    if (row[0]) map[row[0]] = row[1];
  });

  const numberValue = function(key, fallback) {
    const value = Number(map[key]);
    return Number.isFinite(value) ? value : fallback;
  };

  return {
    calendarId: map["Calendar ID"] || "avodahwealthadvisory@gmail.com",
    owner: map["Owner"] || "Ma'am Christine",
    timezone: map["Time Zone"] || "Asia/Manila",
    days: (map["Days Available"] || "Mon,Tue,Wed,Thu,Fri,Sat,Sun").split(",").map(function(day) { return day.trim(); }),
    startHour: numberValue("Start Hour", 9),
    endHour: numberValue("End Hour", 17),
    durationMinutes: numberValue("Appointment Minutes", 30),
    bufferMinutes: numberValue("Buffer Minutes", 30),
    minimumNoticeHours: numberValue("Minimum Notice Hours", 24),
    horizonDays: numberValue("Booking Horizon Days", 30),
    emailReminderMinutes: numberValue("Email Reminder Minutes", 1440),
    popupReminderMinutes: numberValue("Popup Reminder Minutes", 60)
  };
}

function getCalendar_(calendarId) {
  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) throw new Error("Ma'am Christine's calendar is unavailable to this Apps Script account.");
  return calendar;
}

function getAvailability_() {
  const config = getBookingConfig_();
  const calendar = getCalendar_(config.calendarId);
  const now = new Date();
  const earliest = new Date(now.getTime() + config.minimumNoticeHours * 60 * 60 * 1000);
  const lastDay = new Date(now.getTime() + config.horizonDays * 24 * 60 * 60 * 1000);
  const firstDay = new Date(earliest);
  firstDay.setHours(0, 0, 0, 0);
  const eventWindowEnd = new Date(lastDay);
  eventWindowEnd.setHours(23, 59, 59, 999);
  const busy = calendar.getEvents(firstDay, eventWindowEnd).map(function(event) {
    return { start: event.getStartTime().getTime(), end: event.getEndTime().getTime() };
  });
  const days = [];
  const allowedDays = new Set(config.days);
  const stepMinutes = config.durationMinutes + config.bufferMinutes;

  for (let dayOffset = 0; dayOffset <= config.horizonDays; dayOffset += 1) {
    const day = new Date(firstDay);
    day.setDate(firstDay.getDate() + dayOffset);
    const dayName = Utilities.formatDate(day, config.timezone, "EEE");
    if (!allowedDays.has(dayName)) continue;

    const slots = [];
    for (let minutes = config.startHour * 60; minutes + config.durationMinutes <= config.endHour * 60; minutes += stepMinutes) {
      const start = new Date(day);
      start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      const end = new Date(start.getTime() + config.durationMinutes * 60 * 1000);
      if (start.getTime() < earliest.getTime() || start.getTime() > lastDay.getTime()) continue;

      const bufferStart = start.getTime() - config.bufferMinutes * 60 * 1000;
      const bufferEnd = end.getTime() + config.bufferMinutes * 60 * 1000;
      const blocked = busy.some(function(item) {
        return bufferStart < item.end && bufferEnd > item.start;
      });
      if (blocked) continue;

      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        label: Utilities.formatDate(start, config.timezone, "h:mm a")
      });
    }

    if (slots.length) {
      days.push({
        date: Utilities.formatDate(day, config.timezone, "yyyy-MM-dd"),
        label: Utilities.formatDate(day, config.timezone, "EEE, MMM d"),
        slots: slots
      });
    }
  }

  return {
    ok: true,
    owner: config.owner,
    timezone: config.timezone,
    duration_minutes: config.durationMinutes,
    buffer_minutes: config.bufferMinutes,
    days: days
  };
}

function bookConsultation_(payload) {
  const leadId = String(payload.lead_id || "").trim();
  const requestedStart = new Date(payload.start);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leadId) || isNaN(requestedStart.getTime())) {
    return { ok: false, code: "INVALID_REQUEST", error: "Invalid booking request" };
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const leadSheet = spreadsheet.getSheetByName(LEADS_SHEET_NAME);
  const calendarLog = spreadsheet.getSheetByName(CALENDAR_LOG_SHEET_NAME);
  if (!leadSheet || !calendarLog) throw new Error("Required Operations Hub sheets were not found.");

  const lastLeadRow = leadSheet.getLastRow();
  if (lastLeadRow < 2) return { ok: false, code: "LEAD_NOT_FOUND", error: "Lead was not found" };
  const leadCell = leadSheet.getRange(2, 1, lastLeadRow - 1, 1).createTextFinder(leadId).matchEntireCell(true).findNext();
  if (!leadCell) return { ok: false, code: "LEAD_NOT_FOUND", error: "Lead was not found" };

  const leadRow = leadCell.getRow();
  const leadValues = leadSheet.getRange(leadRow, 1, 1, 24).getDisplayValues()[0];
  const currentStatus = leadValues[17];

  if (currentStatus === "Appointment Set") {
    const existing = findExistingBooking_(calendarLog, leadId);
    if (existing) return existing;
    return { ok: false, code: "ALREADY_BOOKED", error: "This lead already has an appointment" };
  }

  const config = getBookingConfig_();
  const validation = validateRequestedSlot_(requestedStart, config);
  if (!validation.ok) return validation;

  const calendar = getCalendar_(config.calendarId);
  const end = new Date(requestedStart.getTime() + config.durationMinutes * 60 * 1000);
  const conflictStart = new Date(requestedStart.getTime() - config.bufferMinutes * 60 * 1000);
  const conflictEnd = new Date(end.getTime() + config.bufferMinutes * 60 * 1000);
  if (calendar.getEvents(conflictStart, conflictEnd).length) {
    return { ok: false, code: "SLOT_UNAVAILABLE", error: "The selected time is no longer available" };
  }

  const clientName = leadValues[9] || "Client";
  const mobile = leadValues[10] || "";
  const email = leadValues[11] || "";
  const inquiryType = leadValues[2] || "Consultation";
  const event = createCalendarEvent_(config, {
    leadId: leadId,
    clientName: clientName,
    mobile: mobile,
    email: email,
    inquiryType: inquiryType,
    start: requestedStart,
    end: end
  });

  updateLead_(leadSheet, leadRow, config.owner, requestedStart);
  addCalendarLog_(calendarLog, config, {
    leadId: leadId,
    clientName: clientName,
    inquiryType: inquiryType,
    start: requestedStart,
    end: end,
    meetLink: event.meetLink,
    eventId: event.id
  });
  SpreadsheetApp.flush();

  return {
    ok: true,
    start: requestedStart.toISOString(),
    end: end.toISOString(),
    meet_link: event.meetLink,
    event_id: event.id
  };
}

function validateRequestedSlot_(start, config) {
  const now = new Date();
  const earliest = new Date(now.getTime() + config.minimumNoticeHours * 60 * 60 * 1000);
  const latest = new Date(now.getTime() + config.horizonDays * 24 * 60 * 60 * 1000);
  const dayName = Utilities.formatDate(start, config.timezone, "EEE");
  const hour = Number(Utilities.formatDate(start, config.timezone, "H"));
  const minute = Number(Utilities.formatDate(start, config.timezone, "m"));
  const stepMinutes = config.durationMinutes + config.bufferMinutes;
  const minutesFromOpen = (hour - config.startHour) * 60 + minute;

  if (start < earliest || start > latest || config.days.indexOf(dayName) === -1) {
    return { ok: false, code: "INVALID_SLOT", error: "The selected time is outside booking availability" };
  }
  if (hour < config.startHour || hour * 60 + minute + config.durationMinutes > config.endHour * 60 || minutesFromOpen % stepMinutes !== 0) {
    return { ok: false, code: "INVALID_SLOT", error: "The selected time is not a valid consultation slot" };
  }
  return { ok: true };
}

function createCalendarEvent_(config, details) {
  const attendees = [];
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) attendees.push({ email: details.email });

  const resource = {
    summary: "Avodah Consultation — " + details.clientName,
    description: [
      "Booked through the Avodah website.",
      "Lead ID: " + details.leadId,
      "Inquiry: " + details.inquiryType,
      details.mobile ? "Mobile: " + details.mobile : "",
      details.email ? "Email: " + details.email : ""
    ].filter(String).join("\n"),
    location: "Google Meet",
    start: { dateTime: details.start.toISOString(), timeZone: config.timezone },
    end: { dateTime: details.end.toISOString(), timeZone: config.timezone },
    attendees: attendees,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: config.emailReminderMinutes },
        { method: "popup", minutes: config.popupReminderMinutes }
      ]
    },
    conferenceData: {
      createRequest: {
        requestId: "avodah-" + details.leadId.replace(/-/g, ""),
        conferenceSolutionKey: { type: "hangoutsMeet" }
      }
    }
  };

  const baseUrl = "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(config.calendarId) + "/events";
  const response = UrlFetchApp.fetch(baseUrl + "?conferenceDataVersion=1&sendUpdates=all", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(resource),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  let result = JSON.parse(response.getContentText() || "{}");
  if (status < 200 || status >= 300 || !result.id) throw new Error("Google Calendar event creation failed: " + status);

  for (let attempt = 0; attempt < 3 && !result.hangoutLink; attempt += 1) {
    Utilities.sleep(400);
    const readResponse = UrlFetchApp.fetch(baseUrl + "/" + encodeURIComponent(result.id), {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (readResponse.getResponseCode() === 200) result = JSON.parse(readResponse.getContentText() || "{}");
  }

  const meetLink = result.hangoutLink ||
    (((result.conferenceData || {}).entryPoints || []).find(function(item) { return item.entryPointType === "video"; }) || {}).uri ||
    result.htmlLink || "";

  return { id: result.id, meetLink: meetLink };
}

function updateLead_(sheet, row, owner, appointmentStart) {
  sheet.getRange(row, 18).setValue("Appointment Set");
  sheet.getRange(row, 19).setValue(owner);
  sheet.getRange(row, 22).setValue(appointmentStart).setNumberFormat("yyyy-mm-dd h:mm AM/PM");
}

function addCalendarLog_(sheet, config, details) {
  let row = sheet.getLastRow() + 1;
  if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
  const dateOnly = new Date(details.start);
  dateOnly.setHours(0, 0, 0, 0);
  const startFraction = (details.start.getHours() * 60 + details.start.getMinutes()) / 1440;
  const endFraction = (details.end.getHours() * 60 + details.end.getMinutes()) / 1440;
  const notes = "Client: " + details.clientName + "\nLead ID: " + details.leadId + "\nInquiry: " + details.inquiryType;

  sheet.getRange(row, 2, 1, 10).setValues([[
    config.owner,
    dateOnly,
    startFraction,
    endFraction,
    "Appointment",
    details.meetLink,
    "Scheduled",
    notes,
    "1 hour",
    "Avodah"
  ]]);
  sheet.getRange(row, 14, 1, 2).setValues([[details.eventId, "Synced"]]);
  sheet.getRange(row, 3).setNumberFormat("yyyy-mm-dd");
  sheet.getRange(row, 4, 1, 2).setNumberFormat("h:mm AM/PM");
}

function findExistingBooking_(calendarLog, leadId) {
  const lastRow = calendarLog.getLastRow();
  if (lastRow < 2) return null;
  const noteCell = calendarLog.getRange(2, 9, lastRow - 1, 1).createTextFinder("Lead ID: " + leadId).matchCase(false).findNext();
  if (!noteCell) return null;
  const row = noteCell.getRow();
  const values = calendarLog.getRange(row, 1, 1, 15).getValues()[0];
  const start = values[11];
  const end = values[12];
  return {
    ok: true,
    already_booked: true,
    start: start instanceof Date ? start.toISOString() : "",
    end: end instanceof Date ? end.toISOString() : "",
    meet_link: values[6] || "",
    event_id: values[13] || ""
  };
}

function safeCell_(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
