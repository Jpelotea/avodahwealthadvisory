const SPREADSHEET_ID = "1n1N3p8-xqWY6OHuEvlsWvTgWyRDVAOYULQgUdc0D3yU";
const SHEET_NAME = "Intake Submissions";

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const expectedSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");

    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse_({ ok: false, error: "Unauthorized" });
    }

    if (!Array.isArray(payload.row) || payload.row.length !== 24) {
      return jsonResponse_({ ok: false, error: "Invalid row" });
    }

    lock.waitLock(10000);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Intake Submissions sheet was not found.");

    const row = payload.row.map(safeCell_);
    sheet.appendRow(row);

    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: "Unable to append submission" });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function safeCell_(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
