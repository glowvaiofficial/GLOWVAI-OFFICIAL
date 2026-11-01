import { SITE_URL } from "@/lib/site-url";
import { complianceConfig } from "@/config/compliance";

/**
 * GLOW VAI Shared Email Layout.
 * Specifications:
 * - 600px max width, single column layout.
 * - System font stack fallback for DM Sans / Bricolage Grotesque.
 * - Colors: Ink (#0F172A), Electric Blue (#0050FF), Soft Gray (#F8FAFC).
 * - Hosted 2x PNG logo at SITE_URL/email/logo.png.
 * - Compliant footer with privacy link and seller information when set.
 * - RFC 8058 compliant marketing footer with unsubscribe link.
 */

export interface EmailLayoutProps {
  preheader: string;
  title: string;
  children: string; // HTML string content inside layout
  stream?: "transactional" | "marketing";
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

export function renderEmailLayout(props: EmailLayoutProps): string {
  const { preheader, title, children, stream = "transactional", unsubscribeUrl, preferencesUrl } = props;

  const hasSellerConfig = Boolean(
    complianceConfig.marketerName ||
      complianceConfig.grievanceOfficerEmail ||
      complianceConfig.licenceNumber
  );

  const sellerBlockHtml = hasSellerConfig
    ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B;">
        <strong>${complianceConfig.marketerName || "GLOW VAI"}</strong><br>
        ${complianceConfig.marketerAddress ? `${complianceConfig.marketerAddress}<br>` : ""}
        ${complianceConfig.licenceNumber ? `Cosmetic Licence No: ${complianceConfig.licenceNumber}<br>` : ""}
        ${complianceConfig.grievanceOfficerEmail ? `Grievance Officer: ${complianceConfig.grievanceOfficerEmail}` : ""}
      </div>
    `
    : "";

  const marketingFooterHtml =
    stream === "marketing"
      ? `
      <div style="margin-top: 16px; font-size: 12px; color: #64748B;">
        You are receiving this email because you opted in to GLOW VAI updates.<br>
        <a href="${unsubscribeUrl || `${SITE_URL}/unsubscribe`}" style="color: #0050FF; text-decoration: underline;">Unsubscribe from marketing emails</a>
        ${preferencesUrl ? ` | <a href="${preferencesUrl}" style="color: #0050FF; text-decoration: underline;">Email Preferences</a>` : ""}
      </div>
    `
      : `
      <div style="margin-top: 12px; font-size: 11px; color: #94A3B8;">
        This transactional email relates directly to your interaction with GLOW VAI.
      </div>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text hidden in UI -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #0F172A; padding: 24px 30px; text-align: center;">
              <a href="${SITE_URL}" target="_blank" style="text-decoration: none;">
                <span style="color: #FFFFFF; font-size: 24px; font-weight: 900; letter-spacing: 2px;">GLOW VAI</span>
              </a>
              <div style="color: #0050FF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px;">
                Verified Skincare Retailer
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 30px; background-color: #FFFFFF;">
              ${children}
            </td>
          </tr>

          <!-- Shared Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 30px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">
              <div>
                <a href="${SITE_URL}/privacy" style="color: #0050FF; text-decoration: underline;">Privacy Policy</a> | 
                <a href="${SITE_URL}/terms" style="color: #0050FF; text-decoration: underline;">Terms of Service</a> | 
                <a href="${SITE_URL}/contact" style="color: #0050FF; text-decoration: underline;">Help & Contact</a>
              </div>
              ${marketingFooterHtml}
              ${sellerBlockHtml}
              <div style="margin-top: 16px; font-size: 11px; color: #94A3B8;">
                &copy; ${new Date().getFullYear()} GLOW VAI. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
