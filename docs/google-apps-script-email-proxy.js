/**
 * GLOW VAI: Resend email proxy (separate Apps Script project).
 *
 * Why this exists: the admin's email sender (app/api/admin/email/route.ts)
 * calls this small trusted script on the server, so the Resend API key lives
 * only in Apps Script and never in the Next.js app or browser JS.
 *
 * SETUP
 * 1. Go to script.google.com -> New project. Paste this whole file in.
 * 2. Project Settings -> Script Properties -> add:
 *      RESEND_API_KEY = <your ROTATED Resend key>
 *      PROXY_SECRET   = <a long random string you make up>
 *    (Rotate the key in your Resend dashboard first - the old one was
 *    exposed in the public JS bundle and must be treated as compromised.)
 * 3. Deploy -> New deployment -> type "Web app".
 *      Execute as: Me
 *      Who has access: Anyone
 * 4. Copy the resulting /exec URL.
 * 5. In the Next.js host's server environment (Vercel project settings, and
 *    .env.local for local work), set:
 *      EMAIL_PROXY_URL    = that /exec URL
 *      EMAIL_PROXY_SECRET = the same value as PROXY_SECRET above
 *    These are server-only variables. Never give them a NEXT_PUBLIC_ prefix:
 *    NEXT_PUBLIC_ values are built into the browser JS, where anyone can
 *    read them and use the proxy to send email as GLOW VAI.
 *
 * The secret is required: without PROXY_SECRET this script refuses every
 * request. Only the admin API route (after an admin session check) sends it,
 * from the server. The rate limit below is a second line of defence.
 */

const MAX_EMAILS_PER_HOUR = 30;

function doGet() {
  return out_({ ok: false, error: "method_not_allowed" });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return out_({ ok: false, error: "busy" });
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const apiKey = props.getProperty("RESEND_API_KEY");
    const expectedSecret = props.getProperty("PROXY_SECRET");

    if (!apiKey) return out_({ ok: false, error: "proxy_not_configured" });

    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // The secret is required, so a missing PROXY_SECRET can never leave the proxy open to anyone with the URL.
    if (!expectedSecret) return out_({ ok: false, error: "proxy_not_configured" });
    if (body.secret !== expectedSecret) {
      return out_({ ok: false, error: "unauthorized" });
    }

    if (!body.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(body.to))) {
      return out_({ ok: false, error: "bad_recipient" });
    }
    if (!body.subject || !body.html) {
      return out_({ ok: false, error: "missing_fields" });
    }

    if (isRateLimited_(props)) {
      return out_({ ok: false, error: "rate_limited" });
    }

    const res = UrlFetchApp.fetch("https://api.resend.com/emails", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + apiKey },
      payload: JSON.stringify({
        from: "GLOW VAI <onboarding@resend.dev>",
        to: [String(body.to)],
        subject: String(body.subject).slice(0, 200),
        html: String(body.html).slice(0, 50000),
      }),
      muteHttpExceptions: true,
    });

    const code = res.getResponseCode();
    const data = JSON.parse(res.getContentText() || "{}");
    if (code >= 200 && code < 300) {
      return out_({ ok: true, id: data.id || null });
    }
    return out_({ ok: false, error: data.message || "resend_error" });
  } catch (err) {
    return out_({ ok: false, error: "server_error" });
  } finally {
    lock.releaseLock();
  }
}

// Simple sliding-window counter stored in Script Properties.
function isRateLimited_(props) {
  const key = "SENT_LOG";
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  let log = [];
  try {
    log = JSON.parse(props.getProperty(key) || "[]").filter((t) => t > hourAgo);
  } catch (e) {
    log = [];
  }
  if (log.length >= MAX_EMAILS_PER_HOUR) return true;
  log.push(now);
  props.setProperty(key, JSON.stringify(log));
  return false;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
