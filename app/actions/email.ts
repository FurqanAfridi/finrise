"use server";

import { revalidatePath } from "next/cache";
import { InvoiceStatus, TenantRole } from "@prisma/client";
import { getCompanyBranding } from "@/lib/company-branding";
import { invoiceEmailContent } from "@/lib/invoice-email";
import { buildInvoicePdf, invoicePdfFilename } from "@/lib/invoice-pdf";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/queries";
import {
  deleteSmtpMailbox,
  listSmtpMailboxes,
  logInvoiceEmail,
  saveSmtpMailbox,
  sendSmtpMail,
  setDefaultSmtpMailbox,
  verifySmtp,
} from "@/lib/smtp";
import { formatMoney } from "@/lib/money";
import { num } from "@/lib/utils";
import { INVITE_FROM_EMAIL, platformMailReady, sendPlatformMail } from "@/lib/platform-mail";
import { canWrite, isPublisherPortal, requireTenant, requireTenantAdmin } from "@/lib/tenant";
import { formField, parseEmail } from "@/lib/validation";
import { NOTIFICATION, notifyReviewers } from "@/lib/notifications";

export async function saveSmtpMailboxAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireTenantAdmin();
  const result = await saveSmtpMailbox(ctx.tenantId, {
    id: formField(formData, "id") || undefined,
    label: formField(formData, "label"),
    host: formField(formData, "host"),
    port: formField(formData, "port"),
    secure: formField(formData, "secure") === "true",
    username: formField(formData, "username"),
    password: String(formData.get("password") ?? ""),
    fromEmail: formField(formData, "fromEmail"),
    fromName: formField(formData, "fromName"),
    makeDefault: formField(formData, "makeDefault") === "true",
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteSmtpMailboxAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireTenantAdmin();
  const id = formField(formData, "id");
  if (!id) return { error: "Mailbox is missing." };
  const result = await deleteSmtpMailbox(ctx.tenantId, id);
  if ("error" in result) return { error: result.error };
  revalidatePath("/settings");
  return { ok: true };
}

export async function setDefaultSmtpMailboxAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireTenantAdmin();
  const id = formField(formData, "id");
  if (!id) return { error: "Mailbox is missing." };
  const result = await setDefaultSmtpMailbox(ctx.tenantId, id);
  if ("error" in result) return { error: result.error };
  revalidatePath("/settings");
  return { ok: true };
}

export async function testSmtpMailboxAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireTenantAdmin();
  const id = formField(formData, "id");
  const mailboxes = await listSmtpMailboxes(ctx.tenantId);
  const mailbox = mailboxes.find((row) => row.id === id) ?? mailboxes.find((row) => row.isDefault) ?? mailboxes[0];
  if (!mailbox?.configured) return { error: "Save SMTP details first, then test." };
  const to = parseEmail(ctx.email ?? "", true);
  if (!to.ok || !to.value) return { error: "Your user account needs a valid email to receive the test." };
  try {
    await verifySmtp(ctx.tenantId, mailbox.id);
    const sent = await sendSmtpMail(ctx.tenantId, {
      to: to.value,
      subject: `SMTP test from ${ctx.tenantName}`,
      text: `This is a test email from ${ctx.tenantName} in Finrise. SMTP is working.`,
      html: `<p>This is a test email from <strong>${ctx.tenantName}</strong> in Finrise. SMTP is working.</p>`,
      mailboxId: mailbox.id,
    });
    if ("error" in sent) return { error: sent.error };
    await logInvoiceEmail({
      tenantId: ctx.tenantId,
      toEmail: to.value,
      subject: `SMTP test from ${ctx.tenantName}`,
      status: "SENT",
      sentById: ctx.userId,
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP test failed.";
    await logInvoiceEmail({
      tenantId: ctx.tenantId,
      toEmail: to.value,
      subject: `SMTP test from ${ctx.tenantName}`,
      status: "FAILED",
      error: message,
      sentById: ctx.userId,
    });
    revalidatePath("/settings");
    return { error: message };
  }
}

/** @deprecated Prefer saveSmtpMailboxAction */
export async function saveSmtpAction(
  prev: { error?: string; ok?: boolean },
  formData: FormData,
) {
  return saveSmtpMailboxAction(prev, formData);
}

/** @deprecated Prefer testSmtpMailboxAction */
export async function testSmtpAction(prev: { error?: string; ok?: boolean }) {
  return testSmtpMailboxAction(prev, new FormData());
}

export async function sendInvoiceEmailAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireTenant();
  if (!canWrite(ctx.tenantRole, ctx.platformRole)) return { error: "You cannot send invoices." };
  const id = formField(formData, "id");
  if (!id) return { error: "Invoice is missing." };
  const mailboxId = formField(formData, "mailboxId") || null;

  const invoice = await prisma.buyerInvoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { buyer: true, vertical: true },
  });
  if (!invoice) return { error: "Invoice not found." };

  const billing = await prisma.$queryRaw<{ email: string | null; address: string | null; contactName: string | null }[]>`
    SELECT email, address, "contactName" FROM "Buyer" WHERE id = ${invoice.buyerId} LIMIT 1
  `;
  const override = parseEmail(formField(formData, "toEmail"), false);
  if (!override.ok) return { error: override.error };
  const to = override.value || billing[0]?.email || invoice.buyer.email;
  const toEmail = parseEmail(to ?? "", true);
  if (!toEmail.ok || !toEmail.value) {
    return { error: "This buyer has no email. Add one on the invoice or in Contacts, then send." };
  }

  const [branding, currency] = await Promise.all([
    getCompanyBranding(ctx.tenantId, ctx.tenantName),
    getSetting(ctx.tenantId, "currency", "USD"),
  ]);
  const content = invoiceEmailContent(
    {
      invoiceNumber: invoice.invoiceNumber,
      periodLabel: invoice.periodLabel,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      leadCount: invoice.leadCount,
      rateType: invoice.rateType,
      rate: invoice.rate,
      revenue: invoice.revenue,
      receivable: invoice.receivable,
      terms: invoice.terms,
      paymentTermsDays: invoice.paymentTermsDays,
      comments: invoice.comments,
      buyerName: invoice.buyer.name,
      buyerEmail: toEmail.value,
      buyerAddress: billing[0]?.address ?? invoice.buyer.address,
      buyerContact: billing[0]?.contactName ?? invoice.buyer.contactName,
      verticalName: invoice.vertical?.name ?? null,
    },
    branding,
    currency,
  );

  const pdfInput = {
    invoiceNumber: invoice.invoiceNumber,
    periodLabel: invoice.periodLabel,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    dueDate: invoice.dueDate,
    createdAt: invoice.createdAt,
    leadCount: invoice.leadCount,
    rateType: invoice.rateType,
    rate: invoice.rate,
    revenue: invoice.revenue,
    receivable: invoice.receivable,
    paymentTermsDays: invoice.paymentTermsDays,
    comments: invoice.comments,
    buyerName: invoice.buyer.name,
    buyerEmail: toEmail.value,
    buyerAddress: billing[0]?.address ?? invoice.buyer.address,
    buyerContact: billing[0]?.contactName ?? invoice.buyer.contactName,
    verticalName: invoice.vertical?.name ?? null,
  };

  let pdf: Buffer;
  try {
    pdf = await buildInvoicePdf(pdfInput, branding, currency);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build the invoice PDF.";
    return { error: message };
  }

  try {
    const sent = await sendSmtpMail(ctx.tenantId, {
      to: toEmail.value,
      subject: content.subject,
      text: content.text,
      html: content.html,
      mailboxId,
      attachments: [
        {
          filename: invoicePdfFilename(invoice.invoiceNumber),
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });
    if ("error" in sent) {
      await logInvoiceEmail({
        tenantId: ctx.tenantId,
        buyerInvoiceId: invoice.id,
        toEmail: toEmail.value,
        subject: content.subject,
        status: "FAILED",
        error: sent.error,
        sentById: ctx.userId,
      });
      return { error: sent.error };
    }
    await logInvoiceEmail({
      tenantId: ctx.tenantId,
      buyerInvoiceId: invoice.id,
      toEmail: toEmail.value,
      subject: content.subject,
      status: "SENT",
      sentById: ctx.userId,
    });
    await prisma.buyerInvoice.updateMany({
      where: { id: invoice.id, tenantId: ctx.tenantId },
      data: { invoiceStatus: InvoiceStatus.SENT },
    });
    await notifyReviewers({
      tenantId: ctx.tenantId,
      type: NOTIFICATION.INVOICE_EMAILED,
      title: "Invoice emailed",
      body: `${content.subject} sent to ${toEmail.value}`,
      href: `/invoices/${invoice.id}`,
      excludeUserId: ctx.userId,
    });
    revalidatePath("/buyers");
    revalidatePath("/settings");
    revalidatePath(`/invoices/${invoice.id}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the invoice email.";
    await logInvoiceEmail({
      tenantId: ctx.tenantId,
      buyerInvoiceId: invoice.id,
      toEmail: toEmail.value,
      subject: content.subject,
      status: "FAILED",
      error: message,
      sentById: ctx.userId,
    });
    revalidatePath("/settings");
    return { error: message };
  }
}

/** Publisher sends their payable invoice to company admins / accountants via platform mail. */
export async function sendPublisherInvoiceToCompanyAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireTenant();
  if (!isPublisherPortal(ctx) || !ctx.linkedPublisherId) {
    return { error: "Only publisher portal users can send invoices to the company this way." };
  }
  if (!platformMailReady()) {
    return {
      error: `Platform email is not configured. Ask support to set PLATFORM_SMTP_* so messages send from ${INVITE_FROM_EMAIL}.`,
    };
  }

  const id = formField(formData, "id");
  if (!id) return { error: "Invoice is missing." };

  const invoice = await prisma.publisherInvoice.findFirst({
    where: { id, tenantId: ctx.tenantId, publisherId: ctx.linkedPublisherId },
    include: { publisher: true, vertical: true },
  });
  if (!invoice) return { error: "Invoice not found." };

  const recipients = await prisma.tenantMembership.findMany({
    where: {
      tenantId: ctx.tenantId,
      role: { in: [TenantRole.ADMIN, TenantRole.ACCOUNTANT] },
    },
    include: { user: { select: { email: true, name: true } } },
  });
  const emails = [
    ...new Set(
      recipients
        .map((row) => row.user.email?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  if (emails.length === 0) {
    return { error: "This company has no admin or accountant emails on file yet." };
  }

  const amount = formatMoney(num(invoice.payable));
  const publisherName = invoice.publisher.name;
  const invoiceLabel = invoice.invoiceNumber || invoice.periodLabel || invoice.id.slice(-8);
  const appUrl = (process.env.AUTH_URL || "https://fundlookup.co").replace(/\/$/, "");
  const href = `${appUrl}/publishers/${invoice.id}`;
  const subject = `Publisher invoice from ${publisherName}: ${invoiceLabel} (${amount})`;
  const text = [
    `${publisherName} submitted an invoice to ${ctx.tenantName}.`,
    "",
    `Invoice: ${invoiceLabel}`,
    `Amount: ${amount}`,
    invoice.vertical?.name ? `Vertical: ${invoice.vertical.name}` : null,
    invoice.periodLabel ? `Period: ${invoice.periodLabel}` : null,
    invoice.dueDate ? `Due: ${invoice.dueDate.toISOString().slice(0, 10)}` : null,
    "",
    `Open in FinRise: ${href}`,
    "",
    `Sent via FinRise from ${INVITE_FROM_EMAIL} on behalf of ${publisherName}.`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p><strong>${escapeHtml(publisherName)}</strong> submitted an invoice to <strong>${escapeHtml(ctx.tenantName)}</strong>.</p>
    <ul>
      <li>Invoice: ${escapeHtml(invoiceLabel)}</li>
      <li>Amount: ${escapeHtml(amount)}</li>
      ${invoice.vertical?.name ? `<li>Vertical: ${escapeHtml(invoice.vertical.name)}</li>` : ""}
      ${invoice.periodLabel ? `<li>Period: ${escapeHtml(invoice.periodLabel)}</li>` : ""}
      ${invoice.dueDate ? `<li>Due: ${escapeHtml(invoice.dueDate.toISOString().slice(0, 10))}</li>` : ""}
    </ul>
    <p><a href="${escapeHtml(href)}">Review this payable in FinRise</a></p>
    <p style="color:#6B7785;font-size:12px;">Sent from ${escapeHtml(INVITE_FROM_EMAIL)} with reference to ${escapeHtml(publisherName)}.</p>
  `;

  const sent = await sendPlatformMail({
    to: emails,
    subject,
    text,
    html,
    replyTo: ctx.email || invoice.publisher.email || INVITE_FROM_EMAIL,
  });
  if ("error" in sent) return { error: sent.error };

  await notifyReviewers({
    tenantId: ctx.tenantId,
    type: NOTIFICATION.INVOICE_EMAILED,
    title: "Publisher invoice received",
    body: `${publisherName} sent invoice ${invoiceLabel} (${amount})`,
    href: `/publishers/${invoice.id}`,
    excludeUserId: ctx.userId,
  });

  revalidatePath("/publishers");
  revalidatePath(`/publishers/${invoice.id}`);
  return { ok: true };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
