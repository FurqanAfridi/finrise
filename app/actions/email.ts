"use server";

import { revalidatePath } from "next/cache";
import { InvoiceStatus } from "@prisma/client";
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
import { canWrite, requireTenant, requireTenantAdmin } from "@/lib/tenant";
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
