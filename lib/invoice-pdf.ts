import { createRequire } from "module";
import { join } from "path";
import type { CompanyBranding } from "@/lib/company-branding";
import { bankPaymentLines } from "@/lib/company-branding";
import { displayDate } from "@/lib/dates";
import { formatNetTerms } from "@/lib/finance/invoice";
import { normalizeInvoiceColor } from "@/lib/invoice-theme";
import { formatMoney } from "@/lib/money";
import { RATE_TYPE_LABEL } from "@/lib/status";
import { num } from "@/lib/utils";

// Load pdfkit via Node require so AFM files resolve from real node_modules
// (Turbopack/webpack break __dirname → /ROOT/.../Helvetica.afm).
const requirePdf = createRequire(join(process.cwd(), "package.json"));
const PDFDocument = requirePdf("pdfkit") as typeof import("pdfkit");

export type InvoicePdfInput = {
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
  paymentTermsDays: number | null;
  comments: string | null;
  buyerName: string;
  buyerEmail: string | null;
  buyerAddress: string | null;
  buyerContact: string | null;
  verticalName: string | null;
};

export async function buildInvoicePdf(
  invoice: InvoicePdfInput,
  branding: CompanyBranding,
  currency: string,
): Promise<Buffer> {
  const amount = num(invoice.receivable) || num(invoice.revenue);
  const qty = invoice.leadCount == null ? null : num(invoice.leadCount);
  const rate = invoice.rate == null ? null : num(invoice.rate);
  const description =
    invoice.comments ||
    [invoice.verticalName, invoice.periodLabel].filter(Boolean).join(" · ") ||
    "Advertising / lead generation";
  const issueDate = invoice.periodEnd ?? invoice.periodStart ?? invoice.createdAt;
  const number = invoice.invoiceNumber || "Invoice";
  const accentHex = normalizeInvoiceColor(branding.invoiceColor);
  const bankLines = bankPaymentLines(branding);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor(accentHex).fontSize(22).font("Helvetica-Bold").text("INVOICE", { align: "right" });
    doc.fillColor("#111827").fontSize(16).text(branding.legalName, 50, 50, { width: 280 });
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    const companyLines = [
      [branding.address, branding.zipCode, branding.countryLabel].filter(Boolean).join(", "),
      [branding.email, branding.phone, branding.website].filter(Boolean).join(" · "),
      branding.taxId ? `Tax ID: ${branding.taxId}` : null,
    ].filter(Boolean) as string[];
    for (const line of companyLines) doc.text(line, { width: 280 });

    doc.fillColor("#111827").fontSize(10).font("Helvetica-Bold").text(number, 350, 78, { align: "right" });

    let y = 130;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#6b7280").text("BILL TO", 50, y);
    y += 14;
    doc.fillColor("#111827").fontSize(11).text(invoice.buyerName, 50, y);
    y += 14;
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    if (invoice.buyerContact) {
      doc.text(invoice.buyerContact, 50, y);
      y += 12;
    }
    if (invoice.buyerAddress) {
      doc.text(invoice.buyerAddress, 50, y, { width: 240 });
      y += doc.heightOfString(invoice.buyerAddress, { width: 240 }) + 4;
    }
    if (invoice.buyerEmail) {
      doc.text(invoice.buyerEmail, 50, y);
    }

    const metaX = 350;
    let metaY = 130;
    const meta = [
      ["Invoice date", displayDate(issueDate)],
      ["Due date", displayDate(invoice.dueDate)],
      ["Terms", formatNetTerms(invoice.paymentTermsDays)],
      invoice.periodLabel ? ["Period", invoice.periodLabel] : null,
    ].filter(Boolean) as [string, string][];
    for (const [label, value] of meta) {
      doc.font("Helvetica").fontSize(9).fillColor("#6b7280").text(label, metaX, metaY, { width: 90 });
      doc.fillColor("#111827").font("Helvetica-Bold").text(value, metaX + 90, metaY, { width: 110, align: "right" });
      metaY += 16;
    }

    y = Math.max(y, metaY) + 24;
    doc.rect(50, y, 495, 22).fill(accentHex);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
    doc.text("Description", 58, y + 6);
    doc.text("Qty", 320, y + 6, { width: 50, align: "right" });
    doc.text("Rate", 380, y + 6, { width: 70, align: "right" });
    doc.text("Amount", 460, y + 6, { width: 75, align: "right" });

    y += 28;
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10).text(description, 58, y, { width: 250 });
    const sub = [RATE_TYPE_LABEL[invoice.rateType], invoice.verticalName].filter(Boolean).join(" · ");
    if (sub) {
      doc.font("Helvetica").fontSize(8).fillColor("#6b7280").text(sub, 58, y + 14, { width: 250 });
    }
    doc.fillColor("#111827").font("Helvetica").fontSize(10);
    doc.text(qty == null ? "—" : qty.toLocaleString(), 320, y, { width: 50, align: "right" });
    doc.text(rate == null ? "—" : formatMoney(rate, currency), 380, y, { width: 70, align: "right" });
    doc.font("Helvetica-Bold").text(formatMoney(amount, currency), 460, y, { width: 75, align: "right" });

    y += 48;
    doc.moveTo(320, y).lineTo(545, y).strokeColor("#e5e7eb").stroke();
    y += 10;
    doc.font("Helvetica").fontSize(10).fillColor("#6b7280").text("Amount due", 320, y, { width: 120 });
    doc.font("Helvetica-Bold").fillColor(accentHex).text(formatMoney(amount, currency), 440, y, {
      width: 95,
      align: "right",
    });

    y += 36;
    if (bankLines.length || branding.paymentNotes) {
      doc.fillColor("#6b7280").font("Helvetica-Bold").fontSize(9).text("PAYMENT DETAILS", 50, y);
      y += 14;
      doc.font("Helvetica").fontSize(9).fillColor("#111827");
      for (const line of bankLines) {
        doc.text(`${line.label}: ${line.value}`, 50, y, { width: 495 });
        y += 12;
      }
      if (branding.paymentNotes) {
        y += 4;
        doc.fillColor("#4b5563").text(branding.paymentNotes, 50, y, { width: 495 });
        y += doc.heightOfString(branding.paymentNotes, { width: 495 }) + 8;
      }
    }

    if (branding.termsAndConditions) {
      y += 12;
      doc.fillColor("#6b7280").font("Helvetica-Bold").fontSize(9).text("TERMS AND CONDITIONS", 50, y);
      y += 14;
      doc.font("Helvetica").fontSize(8).fillColor("#4b5563").text(branding.termsAndConditions, 50, y, { width: 495 });
    }

    doc.end();
  });
}

export function invoicePdfFilename(invoiceNumber: string | null) {
  const safe = (invoiceNumber || "invoice").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${safe}.pdf`;
}
