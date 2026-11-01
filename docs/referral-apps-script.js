/**
 * GLOW VAI partner referral backend (Google Apps Script).
 *
 * Replace the whole project code with this file, save, then Deploy > Manage
 * deployments > Edit > New version. Keep the same web app URL.
 *
 * Changes from the previous version:
 * - Partner UPI IDs and phone numbers are never returned by any GET request.
 * - Scans only count for registered partners, and each device counts once
 *   per partner per 24 hours.
 * - Selfie and licence photos are saved to a private Drive folder; the sheet
 *   stores only the file link, not image data.
 * - The redirect no longer loads Firebase or writes to any external database.
 * - The redirect target is set in REDIRECT_URL below (default: glowvai.in).
 */

var TAB_DRIVER_DETAILS = "Driver Details";
var TAB_DRIVER_REFERRED_USERS = "Driver Referred Users";
var TAB_STUDENT_DETAILS = "Student Details";
var TAB_STUDENT_REFERRED_USERS = "Student Referred Users";
var REFERRAL_SPREADSHEET_ID = "1QXFosg8q0ZwQnqzoh966ZUetM-0Q-LT5d1qR5Hjaftw";
var DOCS_FOLDER_NAME = "GlowVai Partner Documents";

var RATE_PER_REFERRAL = 10;
var REDIRECT_URL = "https://glowvai.in/referral";
var MAX_IMAGE_BYTES = 2 * 1024 * 1024;
var MAX_WRITES_PER_MINUTE = 60;

var DRIVER_HEADERS = ["Driver_ID", "Short_ID", "Registered_At_IST", "Full_Name", "Age", "Phone_Number",
  "Vehicle_Number", "Operating_Hub", "UPI_ID", "Selfie_Photo_URL", "License_Photo_URL",
  "Total_Referred_Users", "Total_Earnings_INR", "Status"];
var STUDENT_HEADERS = ["Student_ID", "Short_ID", "Registered_At_IST", "Full_Name", "Age", "College_Name",
  "Gmail_ID", "Phone_Number", "UPI_ID", "College_ID_Card_URL", "Total_Referred_Users", "Total_Earnings_INR", "Status"];
var LOG_HEADERS = ["Event_ID", "Timestamp_IST", "Partner_ID", "Short_ID", "Partner_Name", "Client_IP_Location",
  "Device_Fingerprint", "Browser", "Platform", "Referral_Status", "Payout_INR", "Destination_URL"];

// ---------- sheets ----------

function referralSpreadsheet_() {
  return SpreadsheetApp.openById(REFERRAL_SPREADSHEET_ID);
}


function ensureSheet_(name, headers) {
  var ss = referralSpreadsheet_();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function setupDatabaseSheets() {
  ensureSheet_(TAB_DRIVER_DETAILS, DRIVER_HEADERS);
  ensureSheet_(TAB_DRIVER_REFERRED_USERS, LOG_HEADERS);
  ensureSheet_(TAB_STUDENT_DETAILS, STUDENT_HEADERS);
  ensureSheet_(TAB_STUDENT_REFERRED_USERS, LOG_HEADERS);
}

function isStudentId_(id) {
  return String(id || "").toUpperCase().indexOf("STUDENT") !== -1 || String(id || "").toUpperCase().indexOf("STU") !== -1;
}

function seqOf_(id) {
  var m = String(id || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function nowIst_() {
  return Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
}

function findPartnerRow_(sheet, partnerId) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  var rows = sheet.getDataRange().getValues();
  var want = String(partnerId || "").toUpperCase();
  var seq = seqOf_(want);
  for (var i = 1; i < rows.length; i++) {
    var id = String(rows[i][0]).toUpperCase();
    var shortId = String(rows[i][1]).toUpperCase();
    if (id === want || shortId === want || (seq > 0 && seqOf_(id) === seq)) {
      return { rowIndex: i + 1, row: rows[i] };
    }
  }
  return null;
}

// ---------- rate limit ----------

function writeAllowed_() {
  var cache = CacheService.getScriptCache();
  var key = "w_" + Math.floor(Date.now() / 60000);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n <= MAX_WRITES_PER_MINUTE;
}

// ---------- photos ----------

function saveDocument_(value, label) {
  var s = String(value || "");
  if (!s || s === "PENDING") return "PENDING";
  if (s.indexOf("data:image/") !== 0) return s.slice(0, 500);
  var m = s.match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
  if (!m) return "INVALID_IMAGE";
  var bytes = Utilities.base64Decode(m[3]);
  if (bytes.length > MAX_IMAGE_BYTES) return "IMAGE_TOO_LARGE";
  var folders = DriveApp.getFoldersByName(DOCS_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(DOCS_FOLDER_NAME);
  var ext = m[2] === "png" ? "png" : m[2] === "webp" ? "webp" : "jpg";
  var file = folder.createFile(Utilities.newBlob(bytes, m[1], label + "_" + Date.now() + "." + ext));
  try { file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) { }
  return file.getUrl();
}

// ---------- GET ----------

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var callback = p.callback;
  var action = p.action || "";

  if (action === "LOGIN_PARTNER") {
    return createApiResponse_(loginPartner_(p.partnerId, p.phone), callback);
  }

  if (action === "GET_PARTNER_STATS") {
    return createApiResponse_(getPartnerStats_(p.partnerId || p.driverId || p.studentId || p.ref), callback);
  }

  var refId = p.ref || p.partnerId || p.driverId || p.studentId;
  if (refId && (!action || action === "SCAN")) {
    return scanAndRedirect_(String(refId), p);
  }

  return createApiResponse_({ status: "SUCCESS", service: "GLOW VAI partner referral", timestamp: new Date().toISOString() }, callback);
}

function scanAndRedirect_(rawId, p) {
  var partnerId = String(rawId).trim().toUpperCase();
  var result = { status: "SKIPPED" };
  try {
    if (writeAllowed_()) {
      result = logScan_(partnerId, {
        fingerprint: p.fp || "",
        ip: p.ip || "",
        location: p.location || "",
        userAgent: p.ua || "",
        platform: p.platform || ""
      });
    }
  } catch (err) {
    result = { status: "ERROR" };
  }
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<meta name="robots" content="noindex">' +
    '<meta http-equiv="refresh" content="0;url=' + REDIRECT_URL + '">' +
    '<title>GLOW VAI</title></head><body>' +
    '<p>Opening GLOW VAI... <a href="' + REDIRECT_URL + '">Continue</a></p>' +
    '<script>window.location.replace("' + REDIRECT_URL + '");</script>' +
    '</body></html>';
  return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.HTML);
}

// ---------- scan logging (shared by GET redirect and POST LOG_SCAN) ----------

function logScan_(partnerId, info) {
  setupDatabaseSheets();
  var isStudent = isStudentId_(partnerId);
  var masterSheet = referralSpreadsheet_().getSheetByName(isStudent ? TAB_STUDENT_DETAILS : TAB_DRIVER_DETAILS);
  var found = findPartnerRow_(masterSheet, partnerId);
  if (!found) return { status: "UNKNOWN_PARTNER" };

  var logSheet = referralSpreadsheet_().getSheetByName(isStudent ? TAB_STUDENT_REFERRED_USERS : TAB_DRIVER_REFERRED_USERS);
  var canonicalId = String(found.row[0]);
  var shortId = String(found.row[1]);
  var name = String(found.row[3] || "");

  var deviceKey = info.fingerprint || (info.ip + "|" + info.userAgent);
  if (deviceKey && deviceCountedRecently_(logSheet, canonicalId, deviceKey)) {
    return { status: "DUPLICATE", partnerId: canonicalId };
  }

  logSheet.appendRow([
    "REF-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    nowIst_(),
    canonicalId,
    shortId,
    name,
    info.location ? (info.ip + " | " + info.location) : info.ip,
    deviceKey,
    shortBrowser_(info.userAgent),
    info.platform || platformOf_(info.userAgent),
    "VALID",
    RATE_PER_REFERRAL,
    REDIRECT_URL
  ]);
  syncCounts_(isStudent, canonicalId);
  return { status: "SUCCESS", partnerId: canonicalId, shortId: shortId, payoutAwarded: RATE_PER_REFERRAL };
}

function deviceCountedRecently_(logSheet, partnerId, deviceKey) {
  if (!logSheet || logSheet.getLastRow() < 2) return false;
  var rows = logSheet.getDataRange().getValues();
  var cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][2] !== partnerId) continue;
    if (rows[i][6] !== deviceKey) continue;
    var t = rows[i][1] instanceof Date ? rows[i][1].getTime() : Date.parse(String(rows[i][1]).replace(" ", "T") + "+05:30");
    if (!isNaN(t) && t > cutoff) return true;
  }
  return false;
}

function syncCounts_(isStudent, partnerId) {
  var ss = referralSpreadsheet_();
  var master = ss.getSheetByName(isStudent ? TAB_STUDENT_DETAILS : TAB_DRIVER_DETAILS);
  var log = ss.getSheetByName(isStudent ? TAB_STUDENT_REFERRED_USERS : TAB_DRIVER_REFERRED_USERS);
  var found = findPartnerRow_(master, partnerId);
  if (!found || !log) return;
  var count = 0;
  var rows = log.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][2]) === String(found.row[0]) && String(rows[i][9]) === "VALID") count++;
  }
  var countCol = isStudent ? 11 : 12;
  var earnCol = isStudent ? 12 : 13;
  master.getRange(found.rowIndex, countCol).setValue(count);
  master.getRange(found.rowIndex, earnCol).setValue(count * RATE_PER_REFERRAL);
}

// ---------- POST ----------

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return createApiResponse_({ status: "ERROR", message: "busy" });
  try {
    if (!writeAllowed_()) return createApiResponse_({ status: "ERROR", message: "rate_limited" });
    setupDatabaseSheets();
    var data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var action = data.action;

    if (action === "REGISTER_DRIVER") return registerDriver_(data);
    if (action === "REGISTER_STUDENT") return registerStudent_(data);
    if (action === "LOG_SCAN" || action === "LOG_REFERRAL") {
      var partnerId = String(data.partnerId || data.driverId || data.studentId || "").trim().toUpperCase();
      var res = logScan_(partnerId, {
        fingerprint: data.deviceFingerprint || "",
        ip: data.clientIp || data.ip || "",
        location: data.location || "",
        userAgent: data.userAgent || "",
        platform: data.platform || ""
      });
      return createApiResponse_(res);
    }
    return createApiResponse_({ status: "ERROR", message: "unknown_action" });
  } catch (err) {
    return createApiResponse_({ status: "ERROR", message: "server_error" });
  } finally {
    lock.releaseLock();
  }
}

function registerDriver_(d) {
  var sheet = ensureSheet_(TAB_DRIVER_DETAILS, DRIVER_HEADERS);
  var phone = String(d.phone || "").replace(/\D/g, "");
  var veh = String(d.vehicleNumber || "").replace(/\s/g, "").toUpperCase();
  if (phone.length < 10) return createApiResponse_({ status: "ERROR", message: "bad_phone" });

  var rows = sheet.getDataRange().getValues();
  var maxSeq = 0;
  for (var i = 1; i < rows.length; i++) {
    maxSeq = Math.max(maxSeq, seqOf_(rows[i][0]));
    if (String(rows[i][5]).replace(/\D/g, "") === phone || String(rows[i][6]).replace(/\s/g, "").toUpperCase() === veh) {
      return createApiResponse_({ status: "SUCCESS", partnerId: String(rows[i][0]), driverId: String(rows[i][0]), shortId: String(rows[i][1]), partnerType: "DRIVER" });
    }
  }

  var seq = maxSeq + 1;
  var id = "GLV-AUTO-" + String(seq).padStart(3, "0") + "-" + generateSuffix_();
  var shortId = "GLV" + String(seq).padStart(3, "0");
  sheet.appendRow([id, shortId, nowIst_(), String(d.fullName || "Auto Partner"), d.age || "", phone, veh,
    String(d.hub || ""), String(d.upiId || ""), saveDocument_(d.selfieUrl, "selfie_" + id),
    saveDocument_(d.idDocUrl, "licence_" + id), 0, 0, "ACTIVE"]);
  return createApiResponse_({
    status: "SUCCESS", partnerId: id, driverId: id, shortId: shortId, partnerType: "DRIVER",
    qrUrl: REDIRECT_URL + "?ref=" + encodeURIComponent(id)
  });
}

function registerStudent_(d) {
  var sheet = ensureSheet_(TAB_STUDENT_DETAILS, STUDENT_HEADERS);
  var phone = String(d.phone || "").replace(/\D/g, "");
  var email = String(d.email || d.gmailId || "").trim().toLowerCase();
  if (phone.length < 10) return createApiResponse_({ status: "ERROR", message: "bad_phone" });

  var rows = sheet.getDataRange().getValues();
  var maxSeq = 0;
  for (var i = 1; i < rows.length; i++) {
    maxSeq = Math.max(maxSeq, seqOf_(rows[i][0]));
    if (String(rows[i][7]).replace(/\D/g, "") === phone || String(rows[i][6]).trim().toLowerCase() === email) {
      return createApiResponse_({ status: "SUCCESS", partnerId: String(rows[i][0]), studentId: String(rows[i][0]), shortId: String(rows[i][1]), partnerType: "STUDENT" });
    }
  }

  var seq = maxSeq + 1;
  var id = "GLV-STUDENT-" + String(seq).padStart(3, "0") + "-" + generateSuffix_();
  var shortId = "GLV-STU-" + String(seq).padStart(3, "0");
  sheet.appendRow([id, shortId, nowIst_(), String(d.fullName || "Student Ambassador"), d.age || "",
    String(d.collegeName || ""), email, phone, String(d.upiId || ""), saveDocument_(d.idDocUrl, "college_id_" + id),
    0, 0, "ACTIVE"]);
  return createApiResponse_({
    status: "SUCCESS", partnerId: id, studentId: id, shortId: shortId, partnerType: "STUDENT",
    qrUrl: REDIRECT_URL + "?ref=" + encodeURIComponent(id)
  });
}

// ---------- stats (public; no UPI, phone or photo links) ----------

function getPartnerStats_(partnerId) {
  var id = String(partnerId || "").trim().toUpperCase();
  var isStudent = isStudentId_(id);
  var ss = referralSpreadsheet_();
  setupDatabaseSheets();
  var found = findPartnerRow_(ss.getSheetByName(isStudent ? TAB_STUDENT_DETAILS : TAB_DRIVER_DETAILS), id);
  if (!found) return { status: "UNKNOWN_PARTNER" };

  var canonical = String(found.row[0]);
  var log = ss.getSheetByName(isStudent ? TAB_STUDENT_REFERRED_USERS : TAB_DRIVER_REFERRED_USERS);
  var valid = 0;
  if (log && log.getLastRow() > 1) {
    var rows = log.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][2]) === canonical && String(rows[i][9]) === "VALID") valid++;
    }
  }
  var bonus = valid >= 100 ? 1000 : 0;
  return {
    status: "SUCCESS",
    partner: { partnerId: canonical, shortId: String(found.row[1]), partnerType: isStudent ? "STUDENT" : "DRIVER", fullName: String(found.row[3] || "") },
    metrics: {
      totalReferrals: valid, verifiedReferrals: valid, totalScans: valid,
      accruedBalance: valid * RATE_PER_REFERRAL + bonus, bonusAmount: bonus,
      targetGoal: 100, progressPercentage: Math.min(100, valid), remainingForBonus: Math.max(0, 100 - valid)
    }
  };
}

// ---------- login (partner ID + registered phone) ----------

function loginPartner_(partnerId, phone) {
  var cache = CacheService.getScriptCache();
  var key = "login_" + Math.floor(Date.now() / 60000);
  var attempts = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(attempts), 120);
  if (attempts > 20) return { status: "RATE_LIMITED" };

  var id = String(partnerId || "").trim().toUpperCase();
  var digits = String(phone || "").replace(/\D/g, "");
  if (!id || digits.length < 10) return { status: "NOT_FOUND" };

  var isStudent = isStudentId_(id);
  var ss = referralSpreadsheet_();
  var master = ss.getSheetByName(isStudent ? TAB_STUDENT_DETAILS : TAB_DRIVER_DETAILS);
  var found = findPartnerRow_(master, id);
  var phoneCol = isStudent ? 7 : 5;
  if (!found || String(found.row[phoneCol]).replace(/\D/g, "").slice(-10) !== digits.slice(-10)) {
    return { status: "NOT_FOUND" };
  }
  var stats = getPartnerStats_(String(found.row[0]));
  if (stats.status !== "SUCCESS") return { status: "NOT_FOUND" };
  return stats;
}

// ---------- helpers ----------

function generateSuffix_() {
  var chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  var s = "";
  for (var i = 0; i < 4; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

function platformOf_(ua) {
  var s = String(ua || "").toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return "iOS";
  if (/android/.test(s)) return "Android";
  if (/windows/.test(s)) return "Windows";
  if (/macintosh|mac os x/.test(s)) return "macOS";
  return "Other";
}

function shortBrowser_(ua) {
  var s = String(ua || "");
  var m = s.match(/(Edg|OPR|Chrome|Firefox|Safari)\/(\d+)/);
  return m ? m[1] + " " + m[2] : (s ? "Other" : "Unknown");
}

function createApiResponse_(data, callback) {
  if (callback && /^[a-zA-Z0-9_$.]+$/.test(String(callback))) {
    return ContentService.createTextOutput(callback + "(" + JSON.stringify(data) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
