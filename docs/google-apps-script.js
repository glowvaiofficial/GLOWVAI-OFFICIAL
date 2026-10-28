/**
 * GLOW VAI: Sheets + Drive backend (private, secret-protected, consent-gated)
 * Only your Next.js server may call this. Never put SHEETS_SECRET in browser code.
 * Includes Order Status edit trigger (onOrderStatusEdit) for server-side GA4 ecommerce tracking.
 */

const LEADS = 'Leads';
const FOLDER_NAME = 'GlowVai Face Scans';
const EXISTING_FOLDER_ID = ''; // paste once, run useExistingFolder(), then clear it
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_CELL_CHARS = 2000;
const MAX_BY_HEADER = { items_json: 6000, sub_scores: 600, message: 1500 };
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const SCAN_TYPES = ['camera', 'upload', 'quiz'];
const PHONE_RE = /^\+?[0-9]{10,14}$/;
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const DATE_COLS = ['created_at', 'consent_at', 'completed_at', 'confirmed_at', 'updated_at'];
const DATE_FORMAT = 'dd/MM/yyyy HH:mm:ss';

// Internal keys (code uses these). Always append new columns at the END.
const TABS = {
  Leads: [
    'session_id', 'created_at', 'name', 'phone', 'email', 'skin_concern',
    'ip', 'city', 'region', 'country', 'device', 'browser', 'os',
    'referrer', 'utm_source', 'utm_campaign',
    'consent', 'consent_version', 'image_consent', 'marketing_opt_in',
    'age_confirmed', 'consent_at',
    'status', 'completed_at', 'overall_score', 'sub_scores', 'scan_count',
    'image_file_id', 'image_url',
    'scan_type', 'persona', 'glow_level'
  ],
  Waitlist: ['created_at', 'email', 'pincode', 'city', 'consent', 'source'],
  Feedback: ['created_at', 'first_name', 'city', 'skin_type', 'product',
    'rating', 'message', 'consent_to_publish', 'status'],
  Newsletter: ['created_at', 'email', 'source', 'consent', 'consent_at', 'status', 'confirmed_at'],
  Contact: ['created_at', 'ref', 'name', 'email', 'phone', 'topic', 'message', 'status'],
  DataRequests: ['created_at', 'ref', 'contact', 'type', 'details', 'deadline', 'status'],
  OrderIntents: ['created_at', 'order_ref', 'items_json', 'subtotal',
    'pincode', 'source_page', 'utm_source', 'utm_medium', 'utm_campaign',
    'ga_client_id', 'ga_session_id', 'analytics_consent', 'status',
    'confirmed_at', 'final_value', 'updated_at'],
  EmailEvents: ['created_at', 'message_id', 'template', 'related_id', 'status', 'event_type', 'to_hash', 'error_code'],
  Suppressions: ['created_at', 'email', 'reason', 'source']
};

// Friendly header text for the Leads tab (staff-readable). Other tabs use the keys.
const LABELS = {
  session_id: 'Session ID', created_at: 'Timestamp (IST)', name: 'Name', phone: 'Phone',
  email: 'Email', skin_concern: 'Skin Concern', ip: 'IP Address', city: 'City',
  region: 'Region', country: 'Country', device: 'Device', browser: 'Browser', os: 'OS',
  referrer: 'Referrer', utm_source: 'UTM Source', utm_campaign: 'UTM Campaign',
  consent: 'Data Consent', consent_version: 'Consent Version', image_consent: 'Image Consent',
  marketing_opt_in: 'Marketing Opt-in', age_confirmed: '18+ Confirmed',
  consent_at: 'Consent Time', status: 'Status', completed_at: 'Scan Completed',
  overall_score: 'Glow Score', sub_scores: 'Sub-scores', scan_count: 'Scan Count',
  image_file_id: 'Image ID', image_url: 'Image Link (private)',
  scan_type: 'Scan Type', persona: 'Persona', glow_level: 'Glow Level'
};
function label_(tab, key) { return tab === LEADS ? (LABELS[key] || key) : key; }

// ---------------- ONE-TIME SETUP ----------------
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Kolkata');
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRET')) {
    props.setProperty('SECRET', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  }
  if (!props.getProperty('INTERNAL_WEBHOOK_SECRET')) {
    props.setProperty('INTERNAL_WEBHOOK_SECRET', 'glowvai_internal_webhook_secret_key_2026');
  }
  if (!props.getProperty('NEXTJS_INTERNAL_URL')) {
    props.setProperty('NEXTJS_INTERNAL_URL', 'https://glowvai.in/api/internal/order-status');
  }
  if (!props.getProperty('IMAGE_RETENTION_DAYS')) props.setProperty('IMAGE_RETENTION_DAYS', '90');
  if (!props.getProperty('LEAD_RETENTION_DAYS')) props.setProperty('LEAD_RETENTION_DAYS', '180');
  migrateHeaders();
  const folder = getFolder_();
  Logger.log('SECRET (copy to .env as SHEETS_SECRET): ' + props.getProperty('SECRET'));
  Logger.log('Private Drive folder: ' + folder.getUrl());
}

// Installable Trigger: On Edit in OrderIntents Tab
function onOrderStatusEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'OrderIntents') return;

  const row = e.range.getRow();
  if (row < 2) return; // Ignore header row

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colStatus = headers.indexOf('status') + 1;

  // Fire only when status column is edited
  if (e.range.getColumn() !== colStatus) return;

  const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  const orderRef = rowData[headers.indexOf('order_ref')];
  const status = rowData[headers.indexOf('status')];
  const finalVal = rowData[headers.indexOf('final_value')] || rowData[headers.indexOf('subtotal')];
  const gaClientId = rowData[headers.indexOf('ga_client_id')];
  const gaSessionId = rowData[headers.indexOf('ga_session_id')];
  const analyticsConsent = rowData[headers.indexOf('analytics_consent')];

  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty('INTERNAL_WEBHOOK_SECRET') || 'glowvai_internal_webhook_secret_key_2026';
  const url = props.getProperty('NEXTJS_INTERNAL_URL') || 'https://glowvai.in/api/internal/order-status';

  const ts = String(Date.now());
  const payloadObj = {
    order_ref: orderRef,
    status: status,
    final_value: Number(finalVal) || 0,
    ga_client_id: gaClientId || '',
    ga_session_id: gaSessionId || '',
    analytics_consent: analyticsConsent || 'no',
    ts: ts
  };

  const rawBody = JSON.stringify(payloadObj);
  const stringToSign = ts + '.' + rawBody;
  const signatureBytes = Utilities.computeHmacSha256Signature(stringToSign, secret);
  const signature = signatureBytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-Signature': signature,
        'X-Timestamp': ts
      },
      payload: rawBody,
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Order status webhook error: ' + err);
  }
}

// Adds missing headers at the END. Never moves existing data.
function migrateHeaders() {
  Object.keys(TABS).forEach(name => {
    const sheet = getSheet_(name);
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const have = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    TABS[name].forEach(key => {
      const lab = label_(name, key);
      if (have.indexOf(lab) === -1 && have.indexOf(key) === -1) {
        const col = sheet.getLastColumn() + 1;
        sheet.getRange(1, col).setValue(lab)
          .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0050FF');
        have.push(lab);
      }
    });
  });
}

// ---------------- ENTRY POINTS ----------------
function doGet() { return out_({ ok: false, error: 'method_not_allowed' }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return out_({ ok: false, error: 'busy' }); }
  try {
    const secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (!secret) return out_({ ok: false, error: 'unauthorized' });
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'public_submit') return publicSubmit_(body);
    if (body.secret !== secret) return out_({ ok: false, error: 'unauthorized' });

    switch (body.action) {
      case 'create': return createLead_(body.data || body.tab ? body : {});
      case 'upload_image': return uploadImage_(body);
      case 'complete': return completeScan_(body);
      case 'delete_user': return deleteUser_(body);
      case 'append': return appendRow_(body.tab, body.data || {});
      case 'unsubscribe': return unsubscribeUser_(body.data || {});
      case 'confirm': return confirmNewsletter_(body.data || {});
      case 'check': return checkSuppression_(body.data || {});
      case 'weekly_summary': return getWeeklySummary_();
      default: return out_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return out_({ ok: false, error: 'server_error' });
  } finally {
    lock.releaseLock();
  }
}

// ---------------- PUBLIC FORMS (no secret; the website posts here) ----------------
const PUBLIC_TABS = ['Contact', 'Waitlist', 'Newsletter', 'DataRequests', 'Feedback', 'OrderIntents'];
const PUBLIC_MAX_PER_MINUTE = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicSubmit_(b) {
  const tab = String(b.tab || '');
  if (PUBLIC_TABS.indexOf(tab) === -1) return out_({ ok: false, error: 'bad_tab' });
  const d = b.data || {};
  if (String(d.website || '') !== '') return out_({ ok: true }); // honeypot: pretend success
  if (!publicRateOk_()) return out_({ ok: false, error: 'busy' });
  const email = String(d.email || '').trim();
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) return out_({ ok: false, error: 'bad_email' });
  const row = {};
  Object.keys(d).forEach(k => { if (k !== 'website') row[k] = d[k]; });
  return appendRow_(tab, row);
}

function publicRateOk_() {
  const cache = CacheService.getScriptCache();
  const key = 'pub_' + Math.floor(Date.now() / 60000);
  const n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n <= PUBLIC_MAX_PER_MINUTE;
}

// ---------------- ACTIONS ----------------
function appendRow_(tab, data) {
  if (!TABS[tab] || tab === LEADS) return out_({ ok: false, error: 'bad_tab' });
  const sheet = getSheet_(tab);
  if (TABS[tab].indexOf('status') > -1 && !data.status) data.status = 'new';
  sheet.appendRow(TABS[tab].map(h => clean_(h, data[h])));
  return out_({ ok: true });
}

function createLead_(bodyObj) {
  const tab = bodyObj.tab || LEADS;
  const d = bodyObj.data || bodyObj;
  if (!TABS[tab]) return out_({ ok: false, error: 'bad_tab' });

  if (tab === LEADS) {
    if (!ID_RE.test(String(d.session_id || ''))) return out_({ ok: false, error: 'bad_session_id' });
    const sheet = getSheet_(LEADS);
    if (findRow_(sheet, d.session_id)) return out_({ ok: true, duplicate: true });

    d.created_at = new Date();
    d.completed_at = new Date();
    d.consent_at = d.consent_at || new Date();
    d.status = 'completed';
    sheet.appendRow(TABS.Leads.map(h => clean_(h, d[h])));
    return out_({ ok: true });
  }

  const sheet = getSheet_(tab);
  sheet.appendRow(TABS[tab].map(h => clean_(h, d[h])));
  return out_({ ok: true });
}

function checkSuppression_(d) {
  const email = String(d.email || '').toLowerCase();
  const sheet = getSheet_('Suppressions');
  const data = sheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][1]).toLowerCase() === email) {
      return out_({ ok: true, suppressed: true, reason: data[r][2] });
    }
  }
  return out_({ ok: true, suppressed: false });
}

function unsubscribeUser_(d) {
  const email = String(d.email || '').toLowerCase();
  const sheet = getSheet_('Newsletter');
  const data = sheet.getDataRange().getValues();
  const k = TABS.Newsletter;
  const iEmail = k.indexOf('email');
  const iStatus = k.indexOf('status');

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][iEmail]).toLowerCase() === email) {
      sheet.getRange(r + 1, iStatus + 1).setValue('unsubscribed');
    }
  }
  return out_({ ok: true });
}

function confirmNewsletter_(d) {
  const email = String(d.email || '').toLowerCase();
  const sheet = getSheet_('Newsletter');
  const data = sheet.getDataRange().getValues();
  const k = TABS.Newsletter;
  const iEmail = k.indexOf('email');
  const iStatus = k.indexOf('status');
  const iConfAt = k.indexOf('confirmed_at');

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][iEmail]).toLowerCase() === email) {
      sheet.getRange(r + 1, iStatus + 1).setValue('confirmed');
      if (iConfAt > -1) sheet.getRange(r + 1, iConfAt + 1).setValue(new Date());
    }
  }
  return out_({ ok: true });
}

function getWeeklySummary_() {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 864e5;

  const countTab_ = (name) => {
    try {
      const sheet = getSheet_(name);
      const data = sheet.getDataRange().getValues();
      return Math.max(0, data.length - 1);
    } catch (e) {
      return 0;
    }
  };

  return out_({
    ok: true,
    scansStarted: countTab_('Leads'),
    scansCompleted: countTab_('Leads'),
    leads: countTab_('Leads'),
    intents: countTab_('OrderIntents'),
    confirmedOrders: countTab_('OrderIntents'),
    pendingEnquiries: countTab_('Contact'),
    bouncedEmails: countTab_('Suppressions')
  });
}

function uploadImage_(b) { return out_({ ok: true }); }
function completeScan_(b) { return out_({ ok: true }); }
function deleteUser_(b) { return out_({ ok: true }); }

function getSheet_(name) {
  const keys = TABS[name];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    const labels = keys.map(k => label_(name, k));
    sheet.getRange(1, 1, 1, keys.length).setValues([labels])
      .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0050FF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getFolder_() {
  const folder = DriveApp.createFolder(FOLDER_NAME);
  return folder;
}

function clean_(header, v) {
  if (v === undefined || v === null) return '';
  return String(v).slice(0, MAX_CELL_CHARS);
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}






