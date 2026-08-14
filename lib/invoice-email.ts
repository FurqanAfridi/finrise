import { APP_NAME } from "@/lib/brand";
import { bankPaymentLines, type CompanyBranding } from "@/lib/company-branding";
import { displayDate } from "@/lib/dates";
import { formatNetTerms } from "@/lib/finance/invoice";
import { invoiceOnAccent, normalizeInvoiceColor } from "@/lib/invoice-theme";
import { money } from "@/lib/money";
import { RATE_TYPE_LABEL } from "@/lib/status";
import { num } from "@/lib/utils";

type InvoiceEmailInput = {
  invoiceNumber: string | null;
  periodLabel: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  leadCount: unknown;
  rateType: keyof typeof RATE_TYPE_LABEL;
  rate: unknown;
  revenue: unknown;
  receivable: unknown;
  terms: string | null;
  paymentTermsDays: number | null;
  comments: string | null;
  buyerName: string;
  buyerEmail: string;
  buyerAddress: string | null;
  buyerContact: string | null;
  verticalName: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function invoiceEmailContent(
  invoice: InvoiceEmailInput,
  branding: CompanyBranding,
  currency: string,
) {
  const amount = num(invoice.receivable) || num(invoice.revenue);
  const qty = invoice.leadCount == null ? null : num(invoice.leadCount);
  const rate = invoice.rate == null ? null : num(invoice.rate);
  const description =
    invoice.comments ||
    [invoice.verticalName, invoice.periodLabel].filter(Boolean).join(" · ") ||
    "Advertising / lead generation";
  const issueDate = invoice.periodEnd ?? invoice.periodStart ?? invoice.createdAt;
  const number = invoice.invoiceNumber || "Invoice";
  const subject = `Invoice ${number} from ${branding.legalName}`;
  const terms = formatNetTerms(invoice.paymentTermsDays);
  const bankLines = bankPaymentLines(branding);
  const accent = normalizeInvoiceColor(branding.invoiceColor);
  const onAccent = invoiceOnAccent(accent);

  const text = [
    `Invoice ${number}`,
    branding.legalName,
    branding.invoiceRepresentativeName,
    [branding.contactEmail, branding.contactPhone].filter(Boolean).join(" · ") || null,
    "",
    `Bill to: ${invoice.buyerName}`,
    invoice.buyerContact ? `Contact: ${invoice.buyerContact}` : null,
    `Amount due: ${money(amount, currency)}`,
    `Invoice date: ${displayDate(issueDate)}`,
    `Due date: ${displayDate(invoice.dueDate)}`,
    `Terms: ${terms}`,
    `Description: ${description}`,
    qty != null ? `Quantity: ${qty}` : null,
    rate != null ? `Rate: ${money(rate, currency)}` : null,
    bankLines.length
      ? `\nPayment details\n${bankLines.map((line) => `${line.label}: ${line.value}`).join("\n")}`
      : null,
    branding.paymentNotes ? `\n${branding.paymentNotes}` : null,
    branding.termsAndConditions ? `\nTerms and conditions\n${branding.termsAndConditions}` : null,
    "",
    "A PDF copy of this invoice is attached for download and your records.",
  ]
    .filter((line) => line != null)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; max-width: 640px; margin: 0 auto;">
      <p style="color: ${accent}; font-weight: 800; letter-spacing: 2px; margin-bottom: 8px;">INVOICE</p>
      <h1 style="margin: 0 0 4px; font-size: 22px;">${escapeHtml(branding.legalName)}</h1>
      ${
        branding.invoiceRepresentativeName
          ? `<p style="color: #4b5563; margin: 0 0 4px;">${escapeHtml(branding.invoiceRepresentativeName)}</p>`
          : ""
      }
      ${
        branding.contactEmail || branding.contactPhone
          ? `<p style="color: #4b5563; margin: 0 0 8px;">${escapeHtml(
              [branding.contactEmail, branding.contactPhone].filter(Boolean).join(" · "),
            )}</p>`
          : ""
      }
      <p style="color: #4b5563; margin: 0 0 24px;">${escapeHtml(number)}</p>
      <p><strong>Bill to</strong><br/>${escapeHtml(invoice.buyerName)}${
        invoice.buyerContact ? `<br/>${escapeHtml(invoice.buyerContact)}` : ""
      }${invoice.buyerAddress ? `<br/>${escapeHtml(invoice.buyerAddress)}` : ""}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <tr><td style="padding: 6px 0; color: #6b7280;">Invoice date</td><td style="text-align: right;">${escapeHtml(displayDate(issueDate))}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Due date</td><td style="text-align: right;">${escapeHtml(displayDate(invoice.dueDate))}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Terms</td><td style="text-align: right;">${escapeHtml(terms)}</td></tr>
        <tr style="background: ${accent}; color: ${onAccent};">
          <td style="padding: 8px;">${escapeHtml(description)}</td>
          <td style="text-align: right; padding: 8px;">${qty != null ? `${qty} × ` : ""}${rate != null ? escapeHtml(money(rate, currency)) : ""}</td>
        </tr>
        <tr><td style="padding: 10px 0; font-weight: 800; color: ${accent};">Amount due</td><td style="text-align: right; font-weight: 800; color: ${accent};">${escapeHtml(money(amount, currency))}</td></tr>
      </table>
      ${
        bankLines.length
          ? `<p style="background: #f8fafc; padding: 12px; border-left: 4px solid ${accent};"><strong>Payment details</strong><br/>${bankLines
              .map((line) => `${escapeHtml(line.label)}: ${escapeHtml(line.value)}`)
              .join("<br/>")}</p>`
          : ""
      }
      ${branding.paymentNotes ? `<p style="color: #4b5563; white-space: pre-line;">${escapeHtml(branding.paymentNotes)}</p>` : ""}
      ${
        branding.termsAndConditions
          ? `<p style="color: #4b5563; white-space: pre-line;"><strong>Terms and conditions</strong><br/>${escapeHtml(branding.termsAndConditions)}</p>`
          : ""
      }
      <p style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 8px; color: #4b5563; font-size: 13px;">
        <strong>Download:</strong> A PDF of this invoice is attached to this email.
      </p>
      <p style="color: #9ca3af; font-size: 12px;">Sent from ${escapeHtml(APP_NAME)} for ${escapeHtml(branding.legalName)}.</p>
    </div>
  `;

  return { subject, text, html };
}
