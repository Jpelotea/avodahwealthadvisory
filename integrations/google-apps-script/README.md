# Avodah Google Apps Script webhook and booking backend

This folder contains the server-side code used by the Netlify website to:

- append website leads to Intake Submissions;
- return only free consultation slots from Ma'am Christine's calendar;
- create a Google Calendar event and Google Meet link;
- update the lead to Appointment Set and assign Ma'am Christine;
- add the appointment to Calendar Log, which feeds Ma'am Christine Calendar.

## One-time activation

1. Open the existing Apps Script project used by GOOGLE_SHEETS_WEBHOOK_URL.
2. Replace Code.gs with the current Code.gs file in this folder.
3. In Project Settings, enable the appsscript.json manifest and replace it with this folder's appsscript.json.
4. Confirm the script account can edit the calendar `avodahwealthadvisory@gmail.com`. Share that calendar with the script account if necessary.
5. Deploy > Manage deployments > Edit > New version.
6. Keep **Execute as: Me** and the existing web-app access setting used by the Netlify webhook.
7. Authorize the requested Sheets, Calendar, and external-request permissions.
8. Keep the existing deployment URL. No Netlify environment-variable change is required.

Until this new Apps Script version is deployed, the website keeps every request as New and shows a graceful manual-follow-up message instead of creating an appointment.
