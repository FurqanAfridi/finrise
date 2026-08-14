import { TENANT_ROLE_LABEL } from "@/lib/status";
import type { TenantRole } from "@prisma/client";
import { APP_NAME } from "@/lib/brand";
import { INVITE_FROM_EMAIL, INVITE_FROM_NAME } from "@/lib/platform-mail";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function greetingName(email: string, inviterName: string | null) {
  const local = email.split("@")[0]?.trim() ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").replace(/\d+/g, " ").trim();
  if (cleaned.length >= 2) {
    return cleaned
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }
  if (inviterName?.trim()) return "there";
  return "there";
}

export function inviteEmailContent(input: {
  inviteeEmail: string;
  companyName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  tenantRole: TenantRole;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const roleLabel = TENANT_ROLE_LABEL[input.tenantRole] ?? input.tenantRole;
  const inviter =
    input.inviterName?.trim() ||
    input.inviterEmail?.trim() ||
    "A teammate";
  const company = input.companyName.trim() || APP_NAME;
  const hiName = greetingName(input.inviteeEmail, input.inviterName);
  const expires = input.expiresAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const year = new Date().getFullYear();
  const site = (process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const brandSite = (process.env.BRAND_SITE_URL || site).replace(/\/$/, "");
  const markUrl = `${site}/brand/logo-mark.png?v=20260813g`;
  const privacyUrl = `${brandSite}/privacy`;
  const termsUrl = `${brandSite}/terms`;
  const helpUrl = `mailto:${INVITE_FROM_EMAIL}?subject=${encodeURIComponent("FundLookup help")}`;
  const unsubUrl = `mailto:${INVITE_FROM_EMAIL}?subject=${encodeURIComponent("Unsubscribe from FundLookup emails")}`;

  const subject = `Welcome to ${company} on FundLookup`;

  const text = [
    "Finance clarity for every campaign",
    "",
    `Hi ${hiName},`,
    "",
    `Welcome to FundLookup! ${inviter} invited you to join ${company} as ${roleLabel}. We are glad to have you on the workspace.`,
    "",
    "FundLookup helps brokers, publishers, and buyers keep invoices, payouts, and profit in one calm place — so your team can focus on the work that grows the business.",
    "",
    "To get started, accept your invitation and take a few minutes to explore the dashboard, invoices, and settings for your company.",
    "",
    `Accept your invitation (expires ${expires}):`,
    input.inviteUrl,
    "",
    "We are committed to giving you a clear, reliable experience. If you need help at any point, reply to this email — our team is ready to assist.",
    "",
    "Thank you for choosing FundLookup. We look forward to working with you.",
    "",
    "Best regards,",
    "The FundLookup team",
    INVITE_FROM_NAME,
    "",
    `© ${year} FundLookup. All rights reserved.`,
    "",
    `You are receiving this email because you were invited to join the FundLookup platform as a ${roleLabel} for ${company}. By accepting, you agree to our Terms of use and Privacy policy.`,
    `Privacy: ${privacyUrl}`,
    `Terms: ${termsUrl}`,
    `Help: ${INVITE_FROM_EMAIL}`,
    `Unsubscribe: ${unsubUrl}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F6F4;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#1B2430;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F6F4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${escapeHtml(markUrl)}" width="36" height="36" alt="FundLookup" style="display:block;border:0;" />
                  </td>
                  <td style="vertical-align:middle;font-size:15px;font-weight:800;letter-spacing:0.04em;color:#366450;">
                    FundLookup
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #DDE5E0;box-shadow:0 8px 28px rgba(27,36,48,0.06);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#366450 0%,#2B503F 100%);padding:36px 36px 32px;">
                    <div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.78);margin-bottom:10px;">
                      You're invited
                    </div>
                    <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:700;color:#FFFFFF;">
                      Finance clarity for every campaign
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:36px;">
                    <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#1B2430;">
                      Hi ${escapeHtml(hiName)},
                    </p>
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3A4553;">
                      Welcome to <strong style="color:#1B2430;">FundLookup</strong>! ${escapeHtml(inviter)} invited you to join
                      <strong style="color:#1B2430;">${escapeHtml(company)}</strong> as
                      <strong style="color:#1B2430;">${escapeHtml(roleLabel)}</strong>. We are thrilled to have you on the team.
                    </p>
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3A4553;">
                      Our mission is to help brokers, publishers, and buyers keep invoices, payouts, and profit clear — so you can bring your campaigns to life without spreadsheet chaos.
                    </p>
                    <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#3A4553;">
                      To get started, accept your invitation and take a few moments to explore the dashboard and company workspace. The link expires on <strong style="color:#1B2430;">${escapeHtml(expires)}</strong>.
                    </p>

                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                      <tr>
                        <td style="border-radius:10px;background:#366450;">
                          <a href="${escapeHtml(input.inviteUrl)}"
                             style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.01em;">
                            Accept invitation
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3A4553;">
                      We are committed to giving you a calm, reliable experience. If you need help at any point, reply to this email — our support team is ready to assist.
                    </p>
                    <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#3A4553;">
                      Thank you for choosing FundLookup. We look forward to working with you.
                    </p>

                    <p style="margin:0;font-size:15px;line-height:1.7;color:#1B2430;">
                      Best regards,<br />
                      <strong>The FundLookup team</strong><br />
                      <span style="color:#6B7785;font-size:13px;">${escapeHtml(INVITE_FROM_NAME)} · ${escapeHtml(INVITE_FROM_EMAIL)}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 12px 8px;text-align:center;">
              <p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:#8A94A1;">
                © ${year} FundLookup. All rights reserved.
              </p>
              <p style="margin:0 0 18px;font-size:12px;line-height:1.65;color:#8A94A1;max-width:520px;margin-left:auto;margin-right:auto;">
                You are receiving this email because you were invited to join the FundLookup platform as a ${escapeHtml(roleLabel)} for ${escapeHtml(company)}. Accepting this invitation also means you agree to our Terms of use and Privacy policy. If you no longer want to receive emails from us, use the unsubscribe link below.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.8;">
                <a href="${escapeHtml(privacyUrl)}" style="color:#366450;text-decoration:none;margin:0 8px;">Privacy policy</a>
                <span style="color:#C5CAD3;">·</span>
                <a href="${escapeHtml(termsUrl)}" style="color:#366450;text-decoration:none;margin:0 8px;">Terms of service</a>
                <span style="color:#C5CAD3;">·</span>
                <a href="${escapeHtml(helpUrl)}" style="color:#366450;text-decoration:none;margin:0 8px;">Help center</a>
                <span style="color:#C5CAD3;">·</span>
                <a href="${escapeHtml(unsubUrl)}" style="color:#366450;text-decoration:none;margin:0 8px;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
