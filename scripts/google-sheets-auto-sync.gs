// MongoDB থেকে Google Sheets-এ read-only, paginated database sync।
const EXPORT_PATH = "/api/sheets/export";
const PAGE_SIZE = 500;
const SYNC_HANDLER = "syncMongoDatabaseToSheets";
const STATUS_SHEET = "__sync_status";

function installMongoSheetSyncTrigger() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty("APP_URL") || !properties.getProperty("SYNC_TOKEN")) {
    throw new Error("Set APP_URL and SYNC_TOKEN in Apps Script project properties first.");
  }

  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === SYNC_HANDLER)
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger(SYNC_HANDLER).timeBased().everyMinutes(5).create();
  syncMongoDatabaseToSheets();
}

function syncMongoDatabaseToSheets() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    console.log("A database sync is already running; this run was skipped.");
    return;
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  try {
    setSyncStatus(spreadsheet, "RUNNING", new Date(), "");
    const collections = fetchExportJson({});
    if (!collections.success || !Array.isArray(collections.collections)) {
      throw new Error(collections.message || "Could not list database collections.");
    }

    collections.collections.forEach((collectionName) => {
      syncCollection(spreadsheet, collectionName);
    });

    setSyncStatus(spreadsheet, "SUCCESS", new Date(), "");
  } catch (error) {
    setSyncStatus(spreadsheet, "FAILED", new Date(), String(error));
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function syncCollection(spreadsheet, collectionName) {
  const temporaryName = safeSheetName("__sync_" + collectionName);
  const finalName = safeSheetName(collectionName);
  const backupName = safeSheetName("__old_" + collectionName);
  const staleBackup = spreadsheet.getSheetByName(backupName);
  if (staleBackup) spreadsheet.deleteSheet(staleBackup);

  let staging = spreadsheet.getSheetByName(temporaryName);
  if (staging) spreadsheet.deleteSheet(staging);
  staging = spreadsheet.insertSheet(temporaryName);

  const records = [];
  let skip = 0;
  while (true) {
    const page = fetchExportJson({
      collection: collectionName,
      skip: skip,
      limit: PAGE_SIZE,
    });
    if (!page.success || !Array.isArray(page.rows)) {
      throw new Error(page.message || "Could not export collection: " + collectionName);
    }

    records.push.apply(records, page.rows);
    skip = page.nextSkip;
    if (page.done) break;
  }

  const headers = [];
  const knownHeaders = {};
  records.forEach((record) => collectHeaders(record, "", headers, knownHeaders));
  if (headers.length === 0) headers.push("_id");

  const output = [headers.map(cellValue)];
  records.forEach((record) => {
    output.push(headers.map((header) => cellValue(getNestedValue(record, header))));
  });

  if (output.length > 0) {
    staging.getRange(1, 1, output.length, headers.length).setValues(output);
  }
  const oldSheet = spreadsheet.getSheetByName(finalName);
  if (oldSheet && oldSheet.getSheetId() !== staging.getSheetId()) {
    oldSheet.setName(backupName);
  }
  try {
    staging.setName(finalName);
    const backup = spreadsheet.getSheetByName(backupName);
    if (backup) spreadsheet.deleteSheet(backup);
  } catch (error) {
    const backup = spreadsheet.getSheetByName(backupName);
    if (backup && !spreadsheet.getSheetByName(finalName)) {
      backup.setName(finalName);
    }
    throw error;
  }
}

function fetchExportJson(parameters) {
  const properties = PropertiesService.getScriptProperties();
  const appUrl = properties.getProperty("APP_URL").replace(/\/+$/, "");
  const query = Object.keys(parameters)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(parameters[key]))
    .join("&");
  const response = UrlFetchApp.fetch(
    appUrl + EXPORT_PATH + (query ? "?" + query : ""),
    {
      method: "get",
      headers: {
        Authorization: "Bearer " + properties.getProperty("SYNC_TOKEN"),
        Accept: "application/json",
      },
      muteHttpExceptions: true,
    },
  );

  let payload;
  try {
    payload = JSON.parse(response.getContentText());
  } catch (error) {
    throw new Error("The app returned a non-JSON database export response.");
  }
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error(payload.message || "Database export failed with HTTP " + response.getResponseCode());
  }
  return payload;
}

function collectHeaders(value, prefix, headers, knownHeaders) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    Object.keys(value).forEach((key) => {
      const path = prefix ? prefix + "." + key : key;
      collectHeaders(value[key], path, headers, knownHeaders);
    });
  } else if (prefix && !knownHeaders[prefix]) {
    knownHeaders[prefix] = true;
    headers.push(prefix);
  }
}

function getNestedValue(value, path) {
  return path.split(".").reduce((current, key) => current == null ? undefined : current[key], value);
}

function cellValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string" && /^[=+\-@]/.test(value)) return "'" + value;
  return value;
}

function safeSheetName(name) {
  return name.replace(/[\[\]:*?/\\]/g, "_").substring(0, 99) || "data";
}

function setSyncStatus(spreadsheet, status, timestamp, detail) {
  let sheet = spreadsheet.getSheetByName(STATUS_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(STATUS_SHEET);
  sheet.clearContents();
  sheet.getRange(1, 1, 2, 3).setValues([
    ["Status", "Last attempt", "Details"],
    [status, timestamp, detail],
  ]);
  sheet.setFrozenRows(1);
}
