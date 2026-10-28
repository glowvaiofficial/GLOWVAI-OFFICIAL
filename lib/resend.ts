/**
 * The Resend API key lives ONLY in the email-proxy Apps Script's Script
 * Properties now - never in this bundle. See docs/google-apps-script-email-proxy.js.
 * Set EMAIL_PROXY_URL below once that proxy is deployed.
 */
const EMAIL_PROXY_URL = process.env.NEXT_PUBLIC_EMAIL_PROXY_URL || "";
const EMAIL_PROXY_SECRET = process.env.NEXT_PUBLIC_EMAIL_PROXY_SECRET || "";

export interface SendEmailOptions {
  to: string;
  subject: string;
  templateType: "scan_report" | "order_confirmation" | "waitlist_alert" | "support_reply";
  data?: {
    name?: string;
    score?: number;
    concern?: string;
    orderRef?: string;
    items?: string;
    subtotal?: number;
    pincode?: string;
    message?: string;
  };
}

export function generateGlowVaiEmailHTML(
  templateType: SendEmailOptions["templateType"],
  data: SendEmailOptions["data"] = {}
): string {
  const name = data.name || "Valued Glow Customer";
  const score = data.score || 82;
  const concern = data.concern || "Acne & Hyperpigmentation";
  const orderRef = data.orderRef || "GV-EXP-500081-102";
  const items = data.items || "Dew Barrier Daily Hydrator, Clarity Pop Niacinamide Serum";
  const subtotal = data.subtotal || 1298;
  const pincode = data.pincode || "520001";
  const message = data.message || "Thank you for contacting GLOW VAI Support. Our skin experts have reviewed your inquiry.";

  if (templateType === "scan_report") {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your GLOW VAI Skin Report</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0F172A;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
            <tr>
              <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 24px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #0050FF; padding: 30px; text-align: center;">
                      <h1 style="color: #FFFFFF; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">GLOW VAI</h1>
                      <p style="color: #FCD34D; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; margin-bottom: 0;">AI Skin Analysis Report</p>
                    </td>
                  </tr>

                  <!-- Hero Body -->
                  <tr>
                    <td style="padding: 35px 30px;">
                      <h2 style="font-size: 22px; color: #0F172A; font-weight: 800; margin-top: 0;">Hello ${name},</h2>
                      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 25px;">
                        Your free browser-based AI face scan has been completed. Here is your plain-language skin formulation analysis:
                      </p>

                      <!-- Score Box -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #EFF6FF; border-radius: 16px; border: 1px solid #BFDBFE; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px; text-align: center;">
                            <span style="font-size: 11px; font-weight: 800; color: #0050FF; text-transform: uppercase; letter-spacing: 1px;">Overall Glow Score</span>
                            <div style="font-size: 42px; font-weight: 900; color: #0050FF; margin: 5px 0;">${score} / 100</div>
                            <span style="font-size: 12px; font-weight: 700; color: #0369A1;">Primary Concern: ${concern}</span>
                          </td>
                        </tr>
                      </table>

                      <h3 style="font-size: 16px; color: #0F172A; font-weight: 800; margin-bottom: 10px;">Recommended 15-Min Routine:</h3>
                      <p style="font-size: 13px; color: #475569; line-height: 1.5; background-color: #F1F5F9; padding: 15px; border-radius: 12px; margin-bottom: 25px;">
                        • <strong>Morning:</strong> Niacinamide 10% + Invisible Fluid SPF 50<br>
                        • <strong>Night:</strong> Dew Barrier Daily Hydrator with Centella Extract
                      </p>

                      <!-- CTA Button -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <a href="https://glowvai.in/shop" target="_blank" style="display: inline-block; background-color: #0050FF; color: #FFFFFF; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 12px rgba(0,80,255,0.3);">
                              Dispatch Routine in 15 Minutes &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8;">
                      © ${new Date().getFullYear()} GLOW VAI Quick-Commerce • Vijayawada, Andhra Pradesh, India<br>
                      On-device computer vision scan. Cosmetic skin insights, not medical advice.
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  if (templateType === "order_confirmation") {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order Confirmed | GLOW VAI Express</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0F172A;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
            <tr>
              <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 24px; border: 1px solid #E2E8F0; overflow: hidden;">
                  
                  <td style="background-color: #059669; padding: 30px; text-align: center;">
                    <h1 style="color: #FFFFFF; font-size: 26px; font-weight: 900; margin: 0;">GLOW VAI EXPRESS</h1>
                    <p style="color: #A7F3D0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; margin-bottom: 0;">⚡ 15-Minute Dark Store Dispatch</p>
                  </td>

                  <tr>
                    <td style="padding: 35px 30px;">
                      <h2 style="font-size: 20px; color: #0F172A; font-weight: 800; margin-top: 0;">Order #${orderRef} Confirmed!</h2>
                      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                        Your routine items have been packed at our temperature-controlled micro-hub in pincode <strong>${pincode}</strong>.
                      </p>

                      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px; margin: 20px 0;">
                        <span style="font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase;">Items Ordered:</span>
                        <p style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 8px 0 12px 0;">${items}</p>
                        <div style="font-size: 16px; font-weight: 900; color: #059669;">Total Paid: ₹${subtotal} (Free Express Delivery)</div>
                      </div>

                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <a href="https://glowvai.in/delivery" target="_blank" style="display: inline-block; background-color: #059669; color: #FFFFFF; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 14px;">
                              Track Rider on Live Radar &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8;">
                      © ${new Date().getFullYear()} GLOW VAI Dark Store Logistics • Andhra Pradesh, India
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  // Fallback / Support Reply Template
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: sans-serif;">
        <table width="100%" padding="30px">
          <tr>
            <td align="center">
              <table width="600" style="background-color: #FFFFFF; border-radius: 20px; padding: 30px; border: 1px solid #E2E8F0;">
                <h1 style="color: #0050FF; margin-top: 0;">GLOW VAI Customer Care</h1>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">Hello ${name},</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">${message}</p>
                <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
                <p style="font-size: 11px; color: #94A3B8;">GLOW VAI Team • Vijayawada & Visakhapatnam, Andhra Pradesh</p>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function isEmailProxyConfigured(): boolean {
  return EMAIL_PROXY_URL.length > 0;
}

export async function sendResendEmail(options: SendEmailOptions) {
  if (!EMAIL_PROXY_URL) {
    return { ok: false, error: "Email proxy not configured (NEXT_PUBLIC_EMAIL_PROXY_URL is empty)." };
  }

  const html = generateGlowVaiEmailHTML(options.templateType, options.data);

  try {
    const res = await fetch(EMAIL_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        secret: EMAIL_PROXY_SECRET,
        to: options.to,
        subject: options.subject,
        html,
      }),
    });

    const data = await res.json().catch(() => ({ ok: false, error: "Bad proxy response" }));
    if (!data.ok) {
      throw new Error(data.error || "Email proxy call failed");
    }
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("Email proxy error:", message);
    return { ok: false, error: message };
  }
}
