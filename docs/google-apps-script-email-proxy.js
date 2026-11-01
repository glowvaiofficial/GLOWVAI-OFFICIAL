/**
 * GLOW VAI: Resend email proxy (separate Apps Script project).
 *
 * Why this exists: the site is a static export (no live Node server), so a
 * Next.js API route never runs in production. This Apps Script plays the
 * same role your leads-sheet script already plays for Google Sheets - a
 * small trusted server the static client can call, so the Resend API key
 * never ships in browser JS again.
 *
 * SETUP
 * 1. Go to script.google.com -> New project. Paste this whole file in.
 * 2. Project Settings -> Script Properties -> add:
 *      RESEND_API_KEY = <your ROTATED Resend key>
 *      PROXY_SECRET   = <any random string you make up>
 *    (Rotate the key in your Resend dashboard first - the old one was
 *    exposed in the public JS bundle and must be treated as compromised.)
 * 3. Deploy -> New deployment -> type "Web app".
 *      Execute as: Me
 *      Who has access: Anyone
 * 4. Copy the resulting /exec URL.
 * 5. In the Next.js project's .env.local (and your host's env settings),
 *    set NEXT_PUBLIC_EMAIL_PROXY_URL to that URL.
 * 6. Also set PROXY_SECRET as NEXT_PUBLIC_EMAIL_PROXY_SECRET in .env.local
 *    if you want the lightweight shared-token check below enabled.
 *
 * This is NOT a real secret boundary - anything shipped to the browser is
 * public once deployed. PROXY_SECRET only raises the bar against random
 * scraping of the URL; it does not protect against someone reading your
 * site's JS. Real protection is: rate limiting (below) + only allowing the
 * three known template types + keeping the Resend key itself server-only.
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

    if (expectedSecret && body.secret !== expectedSecret) {
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
