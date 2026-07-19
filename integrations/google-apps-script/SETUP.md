# Google Sheets submission sync

This integration sends verified Netlify `client-needs-check` form submissions to the private **Client Needs Intake Submissions** Google Sheet.

## 1. Create the Apps Script endpoint

1. Open the destination Google Sheet.
2. Choose **Extensions → Apps Script**.
3. Replace the editor contents with `Code.gs` from this folder and save.
4. Open **Project Settings → Script properties**.
5. Add `WEBHOOK_SECRET` with a long, randomly generated value. Do not commit or share this value.
6. Choose **Deploy → New deployment → Web app**.
7. Set **Execute as** to **Me** and access to **Anyone**.
8. Authorize with the Google account that owns the sheet, deploy, and copy the `/exec` URL.

The shared secret rejects requests that do not originate from the configured Netlify function. The script also neutralizes spreadsheet-formula prefixes before appending cells.

## 2. Add Netlify environment variables

In Netlify, open the Avodah site and add:

- `GOOGLE_SHEETS_WEBHOOK_URL` = the Apps Script `/exec` deployment URL
- `GOOGLE_SHEETS_WEBHOOK_SECRET` = the same secret stored in Apps Script

Use **Production** scope. Trigger a new production deploy after saving the variables.

## 3. Test

Submit a consultation request through `/needs-check`. Confirm that:

- Netlify Forms shows the submission under `client-needs-check`.
- A new row appears in the `Intake Submissions` sheet.
- The row starts with `New` in **Follow-up Status**.

If the row does not appear, check the Netlify function logs for `sync-client-needs` and the Apps Script **Executions** page.
