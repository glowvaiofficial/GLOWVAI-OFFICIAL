import { emailCopy } from "@/config/email-copy";
import { renderEmailLayout } from "@/lib/email/templates/Layout";
import { SITE_URL } from "@/lib/site-url";
import { EmailTemplateName } from "@/lib/email/types";

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  const s = String(str);
  return s
    .replace(/[\r\n]/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderEmail(
  template: EmailTemplateName,
  data: Record<string, any>,
  stream: "transactional" | "marketing" = "transactional"
): RenderedEmail {
  switch (template) {
    case "contact_ack": {
      const ref = escapeHtml(data.ref || "CT-PENDING");
      const waLink = "https://wa.me/918977855998?text=" + encodeURIComponent(`Hello GLOW VAI, following up on enquiry ${ref}`);
      const copy = emailCopy.contact_ack;

      const htmlContent = `
        <h2 style="font-size: 20px; color: #0F172A; margin-top: 0;">${copy.title}</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">${copy.intro}</p>
        
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Enquiry Reference</span>
          <div style="font-size: 18px; font-weight: 800; color: #0050FF; margin-top: 4px;">${ref}</div>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.6;">${copy.timeframeNote}</p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${waLink}" target="_blank" style="display: inline-block; background-color: #0050FF; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 10px; min-height: 44px; line-height: 44px;">
            ${copy.whatsappCta}
          </a>
        </div>
      `;

      const text = `${copy.title}\n\n${copy.intro}\n\nEnquiry Reference: ${ref}\n\n${copy.timeframeNote}\n\nWhatsApp: ${waLink}`;

      return {
        subject: copy.subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream }),
        text,
      };
    }

    case "contact_notify": {
      const ref = escapeHtml(data.ref || "CT-PENDING");
      const topic = escapeHtml(data.topic || "General Enquiry");
      const name = escapeHtml(data.name || "Anonymous");
      const email = escapeHtml(data.email || "Not provided");
      const phone = escapeHtml(data.phone || "Not provided");
      const message = escapeHtml(data.message || "");
      const copy = emailCopy.contact_notify;
      const subject = copy.subject(topic, ref);

      const htmlContent = `
        <h2 style="font-size: 18px; color: #0F172A; margin-top: 0;">New Customer Enquiry</h2>
        <table width="100%" border="0" cellspacing="0" cellpadding="8" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; font-size: 13px;">
          <tr><td><strong>Reference:</strong></td><td>${ref}</td></tr>
          <tr><td><strong>Topic:</strong></td><td>${topic}</td></tr>
          <tr><td><strong>Name:</strong></td><td>${name}</td></tr>
          <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
          <tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; font-size: 13px; color: #0F172A;">
          <strong>Message Body:</strong><br>${message}
        </div>
      `;

      const text = `New Customer Enquiry\nReference: ${ref}\nTopic: ${topic}\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nMessage:\n${message}`;

      return {
        subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream }),
        text,
      };
    }

    case "lead_report": {
      const persona = escapeHtml(data.persona || "Balanced Hydration Persona");
      const glowLevel = escapeHtml(data.glowLevel || 3);
      const scoreBandText = escapeHtml(data.scoreBandText || `Band ${glowLevel} of 5`);
      const orderRef = escapeHtml(data.orderRef || `GV-${Date.now().toString().slice(-6)}`);
      const quests = Array.isArray(data.quests) ? data.quests : [];
      const copy = emailCopy.lead_report;
      const subject = copy.subject(persona);

      const itemsHtml = quests
        .map(
          (q: any) => `
        <div style="border-bottom: 1px solid #E2E8F0; padding: 12px 0;">
          <div style="font-size: 14px; font-weight: 700; color: #0F172A;">${escapeHtml(q.productName)}</div>
          <div style="font-size: 12px; color: #64748B;">Brand: ${escapeHtml(q.brand)} | Size: ${escapeHtml(q.size)} | Price: ₹${escapeHtml(q.price)} (as on website, confirmed on WhatsApp)</div>
          <a href="${SITE_URL}/product/${escapeHtml(q.slug || "")}" style="font-size: 12px; color: #0050FF; text-decoration: underline;">View details on site</a>
        </div>
      `
        )
        .join("");

      const waMsg = encodeURIComponent(`Hello GLOW VAI, I would like to order my routine (Ref: ${orderRef}, Persona: ${persona})`);
      const waLink = `https://wa.me/918977855998?text=${waMsg}`;

      const htmlContent = `
        <h2 style="font-size: 20px; color: #0F172A; margin-top: 0;">${copy.title}</h2>
        <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <span style="font-size: 11px; font-weight: 700; color: #0050FF; text-transform: uppercase;">Skin Profile</span>
          <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 4px;">${persona}</div>
          <div style="font-size: 13px; color: #0369A1; margin-top: 2px;">Score Band: ${scoreBandText} (Glow Level ${glowLevel})</div>
        </div>

        <h3 style="font-size: 15px; color: #0F172A; margin-top: 20px;">Your Recommended Routine Items:</h3>
        ${itemsHtml || '<p style="font-size: 13px; color: #64748B;">Standard skin barrier routine products.</p>'}

        <div style="text-align: center; margin: 24px 0;">
          <a href="${waLink}" target="_blank" style="display: inline-block; background-color: #0050FF; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; min-height: 44px; line-height: 44px;">
            ${copy.whatsappCta}
          </a>
        </div>

        <p style="font-size: 12px; color: #64748B; font-style: italic; margin-top: 20px;">${copy.disclaimer}</p>
        <p style="font-size: 11px; color: #94A3B8;"><a href="${SITE_URL}/privacy#your-rights" style="color: #0050FF; text-decoration: underline;">${copy.rightsText}</a></p>
      `;

      const text = `${copy.title}\nPersona: ${persona}\nScore Band: ${scoreBandText}\n\nDisclaimer: ${copy.disclaimer}\nOrder on WhatsApp: ${waLink}`;

      return {
        subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream }),
        text,
      };
    }

    case "lead_alert": {
      const name = escapeHtml(data.firstName || "Customer");
      const phoneDigits = escapeHtml(data.lastPhoneDigits || "XX");
      const city = escapeHtml(data.city || "Unknown City");
      const persona = escapeHtml(data.persona || "Standard");
      const scanType = escapeHtml(data.scanType || "camera");
      const rowUrl = escapeHtml(data.rowUrl || `${SITE_URL}/admin`);
      const copy = emailCopy.lead_alert;

      const htmlContent = `
        <h2 style="font-size: 18px; color: #0F172A; margin-top: 0;">New Scan Lead Summary</h2>
        <ul style="font-size: 13px; color: #334155; line-height: 1.8;">
          <li><strong>First Name:</strong> ${name}</li>
          <li><strong>Phone Ending:</strong> ...${phoneDigits}</li>
          <li><strong>City:</strong> ${city}</li>
          <li><strong>Persona:</strong> ${persona}</li>
          <li><strong>Scan Type:</strong> ${scanType}</li>
        </ul>
        <div style="margin-top: 16px;">
          <a href="${rowUrl}" target="_blank" style="font-size: 13px; color: #0050FF; text-decoration: underline;">View entry in Sheets dashboard</a>
        </div>
      `;

      const text = `New Scan Lead Summary\nName: ${name}\nPhone: ...${phoneDigits}\nCity: ${city}\nPersona: ${persona}\nScan Type: ${scanType}`;

      return {
        subject: copy.subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream }),
        text,
      };
    }

    case "order_intent_notify": {
      const ref = escapeHtml(data.ref || "GV-INTENT");
      const items = escapeHtml(data.items || "Routine items");
      const subtotal = escapeHtml(data.subtotal || "0");
      const pincode = escapeHtml(data.pincode || "Not provided");
      const sourcePage = escapeHtml(data.sourcePage || "/");
      const utmSource = escapeHtml(data.utmSource || "direct");
      const time = escapeHtml(data.time || new Date().toISOString());
      const copy = emailCopy.order_intent_notify;
      const subject = copy.subject(ref);

      const htmlContent = `
        <h2 style="font-size: 18px; color: #0F172A; margin-top: 0;">WhatsApp Order Intent (${ref})</h2>
        <table width="100%" border="0" cellspacing="0" cellpadding="8" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; font-size: 13px;">
          <tr><td><strong>Reference:</strong></td><td>${ref}</td></tr>
          <tr><td><strong>Items:</strong></td><td>${items}</td></tr>
          <tr><td><strong>Computed Subtotal:</strong></td><td>₹${subtotal}</td></tr>
          <tr><td><strong>Pincode:</strong></td><td>${pincode}</td></tr>
          <tr><td><strong>Source Page:</strong></td><td>${sourcePage}</td></tr>
          <tr><td><strong>UTM Source:</strong></td><td>${utmSource}</td></tr>
          <tr><td><strong>Time:</strong></td><td>${time}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 12px; background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; font-size: 12px; color: #92400E;">
          <strong>Staff Note:</strong> ${copy.staffNote}
        </div>
      `;

      const text = `WhatsApp Order Intent (${ref})\nItems: ${items}\nSubtotal: ₹${subtotal}\nPincode: ${pincode}\nSource Page: ${sourcePage}\nUTM Source: ${utmSource}\nTime: ${time}\n\nNote: ${copy.staffNote}`;

      return {
        subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream }),
        text,
      };
    }

    case "waitlist_confirm": {
      const copy = emailCopy.waitlist_confirm;
      const htmlContent = `
        <h2 style="font-size: 20px; color: #0F172A; margin-top: 0;">${copy.title}</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">${copy.body}</p>
        <p style="font-size: 12px; color: #94A3B8; margin-top: 20px;">${copy.leaveText}</p>
      `;
      const text = `${copy.title}\n\n${copy.body}\n\n${copy.leaveText}`;
      return {
        subject: copy.subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream }),
        text,
      };
    }

    case "data_request_ack": {
      const ref = escapeHtml(data.ref || "DR-PENDING");
      const copy = emailCopy.data_request_ack;

      const htmlContent = `
        <h2 style="font-size: 20px; color: #0F172A; margin-top: 0;">${copy.title}</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">${copy.body}</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 14px;">
          <strong>Request Reference:</strong> <span style="color: #0050FF;">${ref}</span>
        </div>
      `;
      const text = `${copy.title}\n\n${copy.body}\nReference: ${ref}`;
      return {
        subject: copy.subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream }),
        text,
      };
    }

    case "data_request_notify": {
      const ref = escapeHtml(data.ref || "DR-PENDING");
      const reqType = escapeHtml(data.reqType || "Export/Deletion");
      const contact = escapeHtml(data.contact || "Not provided");
      const deadline = escapeHtml(data.deadline || "30 days");
      const copy = emailCopy.data_request_notify;
      const subject = copy.subject(ref);

      const htmlContent = `
        <h2 style="font-size: 18px; color: #0F172A; margin-top: 0;">Action Required: Privacy Data Request</h2>
        <table width="100%" border="0" cellspacing="0" cellpadding="8" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; font-size: 13px;">
          <tr><td><strong>Reference:</strong></td><td>${ref}</td></tr>
          <tr><td><strong>Request Type:</strong></td><td>${reqType}</td></tr>
          <tr><td><strong>Contact Info:</strong></td><td>${contact}</td></tr>
          <tr><td><strong>Legal Response Deadline:</strong></td><td>${deadline}</td></tr>
        </table>
      `;
      const text = `Action Required: Privacy Data Request\nReference: ${ref}\nType: ${reqType}\nContact: ${contact}\nDeadline: ${deadline}`;

      return {
        subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream }),
        text,
      };
    }

    case "review_request": {
      const reviewToken = escapeHtml(data.token || "sample");
      const reviewUrl = `${SITE_URL}/review/${reviewToken}`;
      const copy = emailCopy.review_request;

      const htmlContent = `
        <h2 style="font-size: 20px; color: #0F172A; margin-top: 0;">${copy.title}</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">${copy.body}</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${reviewUrl}" target="_blank" style="display: inline-block; background-color: #0050FF; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; min-height: 44px; line-height: 44px;">
            ${copy.cta}
          </a>
        </div>
      `;
      const text = `${copy.title}\n\n${copy.body}\n\nReview link: ${reviewUrl}`;

      return {
        subject: copy.subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream }),
        text,
      };
    }

    case "weekly_digest": {
      const scansStarted = escapeHtml(data.scansStarted || 0);
      const scansCompleted = escapeHtml(data.scansCompleted || 0);
      const leads = escapeHtml(data.leads || 0);
      const intents = escapeHtml(data.intents || 0);
      const confirmedOrders = escapeHtml(data.confirmedOrders || 0);
      const pendingEnquiries = escapeHtml(data.pendingEnquiries || 0);
      const bouncedEmails = escapeHtml(data.bouncedEmails || 0);
      const copy = emailCopy.weekly_digest;

      const htmlContent = `
        <h2 style="font-size: 18px; color: #0F172A; margin-top: 0;">GLOW VAI Weekly Performance Summary</h2>
        <table width="100%" border="0" cellspacing="0" cellpadding="8" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; font-size: 13px;">
          <tr><td><strong>Scans Started:</strong></td><td>${scansStarted}</td></tr>
          <tr><td><strong>Scans Completed:</strong></td><td>${scansCompleted}</td></tr>
          <tr><td><strong>Leads Saved:</strong></td><td>${leads}</td></tr>
          <tr><td><strong>WhatsApp Order Intents:</strong></td><td>${intents}</td></tr>
          <tr><td><strong>Confirmed Orders:</strong></td><td>${confirmedOrders}</td></tr>
          <tr><td><strong>Enquiries Over 24h Unreplied:</strong></td><td>${pendingEnquiries}</td></tr>
          <tr><td><strong>Bounced Emails:</strong></td><td>${bouncedEmails}</td></tr>
        </table>
      `;
      const text = `Weekly Performance Summary\nScans Started: ${scansStarted}\nScans Completed: ${scansCompleted}\nLeads: ${leads}\nIntents: ${intents}\nConfirmed Orders: ${confirmedOrders}\nPending Enquiries: ${pendingEnquiries}\nBounces: ${bouncedEmails}`;

      return {
        subject: copy.subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream }),
        text,
      };
    }

    case "newsletter_confirm": {
      const confirmToken = escapeHtml(data.token || "sample");
      const confirmUrl = `${SITE_URL}/api/newsletter?token=${confirmToken}`;
      const copy = emailCopy.newsletter_confirm;

      const htmlContent = `
        <h2 style="font-size: 20px; color: #0F172A; margin-top: 0;">${copy.title}</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">${copy.body}</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${confirmUrl}" target="_blank" style="display: inline-block; background-color: #0050FF; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; min-height: 44px; line-height: 44px;">
            ${copy.cta}
          </a>
        </div>
      `;
      const text = `${copy.title}\n\n${copy.body}\n\nConfirm link: ${confirmUrl}`;

      return {
        subject: copy.subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream: "marketing", unsubscribeUrl: `${SITE_URL}/unsubscribe` }),
        text,
      };
    }

    case "newsletter_welcome": {
      const copy = emailCopy.newsletter_welcome;
      const htmlContent = `
        <h2 style="font-size: 20px; color: #0F172A; margin-top: 0;">${copy.title}</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">${copy.body}</p>
      `;
      const text = `${copy.title}\n\n${copy.body}`;

      return {
        subject: copy.subject,
        html: renderEmailLayout({ preheader: copy.preheader, title: copy.title, children: htmlContent, stream: "marketing", unsubscribeUrl: `${SITE_URL}/unsubscribe` }),
        text,
      };
    }

    default: {
      const defaultTitle = "GLOW VAI Update";
      return {
        subject: "GLOW VAI Notice",
        html: renderEmailLayout({ preheader: "Notice from GLOW VAI", title: defaultTitle, children: "<p>Thank you for contacting GLOW VAI.</p>", stream }),
        text: "Thank you for contacting GLOW VAI.",
      };
    }
  }
}
