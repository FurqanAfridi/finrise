"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import {
  InvoiceStatus,
  PartnerTier,
  PaymentStatus,
  Prisma,
  TenantRole,
} from "@prisma/client";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { inviteEmailContent } from "@/lib/invite-email";
import { platformAdminPublicUrl } from "@/lib/platform-host";
import { platformMailReady, sendPlatformMail } from "@/lib/platform-mail";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/roles";
import {
  formField,
  parseEmail,
  parseMoney,
  parsePersonName,
  parsePassword,
} from "@/lib/validation";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function revalidateAdmin(...paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

export async function platformInviteAdmin(
  _prev: { error?: string; ok?: boolean; inviteUrl?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; inviteUrl?: string }> {
  const session = await requirePlatformAdmin();
  const email = parseEmail(formField(formData, "email"), true);
  if (!email.ok || !email.value) return { error: email.ok ? "Email is required." : email.error };

  const existing = await prisma.user.findUnique({ where: { email: email.value } });
  if (existing?.role === Role.ADMIN) {
    return { error: "This person is already a platform admin." };
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.invite.create({
    data: {
      email: email.value,
      token,
      role: Role.ADMIN,
      tenantRole: TenantRole.ADMIN,
      expiresAt,
      createdById: session.user.id,
      tenantId: null,
    },
  });

  const inviteUrl = `${platformAdminPublicUrl()}/invite/${token}`;
  const content = inviteEmailContent({
    inviteeEmail: email.value,
    companyName: "FundLookup platform",
    inviterName: session.user.name ?? null,
    inviterEmail: session.user.email ?? null,
    tenantRole: TenantRole.ADMIN,
    inviteUrl,
    expiresAt,
  });

  let emailed = false;
  if (platformMailReady()) {
    const sent = await sendPlatformMail({
      to: email.value,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    emailed = !("error" in sent);
  }

  revalidateAdmin("/admin/invites", "/admin/users");
  return { ok: true, inviteUrl: emailed ? undefined : inviteUrl };
}

export async function platformUpdateUser(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return { error: "User not found." };
  const nameRaw = formField(formData, "name");
  let nameValue: string | null = null;
  if (nameRaw) {
    const name = parsePersonName(nameRaw, "Name");
    if (!name.ok) return { error: name.error };
    nameValue = name.value;
  }
  const email = parseEmail(formField(formData, "email"), true);
  if (!email.ok || !email.value) return { error: email.ok ? "Email is required." : email.error };
  const role = formField(formData, "role") === Role.ADMIN ? Role.ADMIN : Role.MEMBER;
  const passwordRaw = String(formData.get("password") ?? "");
  const data: Prisma.UserUpdateInput = {
    name: nameValue,
    email: email.value,
    role,
  };
  if (passwordRaw.trim()) {
    const password = parsePassword(passwordRaw);
    if (!password.ok) return { error: password.error };
    data.passwordHash = await bcrypt.hash(password.value, 12);
  }
  await prisma.user.update({ where: { id }, data });
  revalidateAdmin("/admin/users", `/admin/users/${id}`);
  return { ok: true };
}

export async function platformDeleteUser(formData: FormData) {
  const session = await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return;
  if (id === session.user.id) return { error: "You cannot delete your own account." };
  await prisma.user.delete({ where: { id } });
  revalidateAdmin("/admin/users");
  return { ok: true };
}

export async function platformUpsertTenant(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  const name = formField(formData, "name").trim();
  if (!name) return { error: "Company name is required." };
  let slug = formField(formData, "slug").trim() || slugify(name);
  slug = slugify(slug);
  if (!slug) return { error: "Slug is required." };

  if (id) {
    await prisma.tenant.update({ where: { id }, data: { name, slug } });
    revalidateAdmin("/admin/tenants", `/admin/tenants/${id}`);
    return { ok: true, id };
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      financeSettings: { create: {} },
    },
  });
  revalidateAdmin("/admin/tenants");
  return { ok: true, id: tenant.id };
}

export async function platformDeleteTenant(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return;
  await prisma.tenant.delete({ where: { id } });
  revalidateAdmin("/admin/tenants");
  return { ok: true };
}

export async function platformUpsertMembership(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  const userId = formField(formData, "userId");
  const tenantId = formField(formData, "tenantId");
  const role = (formField(formData, "role") || TenantRole.BROKER) as TenantRole;
  if (!userId || !tenantId) return { error: "User and company are required." };

  if (id) {
    await prisma.tenantMembership.update({
      where: { id },
      data: { role, userId, tenantId },
    });
  } else {
    await prisma.tenantMembership.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: { role },
      create: { userId, tenantId, role },
    });
  }
  revalidateAdmin("/admin/memberships", `/admin/users/${userId}`, `/admin/tenants/${tenantId}`);
  return { ok: true };
}

export async function platformDeleteMembership(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return;
  await prisma.tenantMembership.delete({ where: { id } });
  revalidateAdmin("/admin/memberships");
  return { ok: true };
}

export async function platformUpdateBuyerInvoice(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return { error: "Invoice not found." };
  const revenue = parseMoney(formField(formData, "revenue"), "Revenue", true);
  const receivable = parseMoney(formField(formData, "receivable"), "Receivable", true);
  const received = parseMoney(formField(formData, "received"), "Received", false);
  if (!revenue.ok) return { error: revenue.error };
  if (!receivable.ok) return { error: receivable.error };
  if (!received.ok) return { error: received.error };

  await prisma.buyerInvoice.update({
    where: { id },
    data: {
      invoiceNumber: formField(formData, "invoiceNumber") || null,
      periodLabel: formField(formData, "periodLabel") || null,
      paymentStatus: (formField(formData, "paymentStatus") || PaymentStatus.UNPAID) as PaymentStatus,
      invoiceStatus: (formField(formData, "invoiceStatus") || InvoiceStatus.NOT_SENT) as InvoiceStatus,
      revenue: revenue.value!,
      receivable: receivable.value!,
      received: received.value,
      paymentMethod: formField(formData, "paymentMethod") || null,
      comments: formField(formData, "comments") || null,
    },
  });
  revalidateAdmin("/admin/buyer-invoices", `/admin/buyer-invoices/${id}`);
  return { ok: true };
}

export async function platformDeleteBuyerInvoice(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return;
  await prisma.buyerInvoice.delete({ where: { id } });
  revalidateAdmin("/admin/buyer-invoices");
  return { ok: true };
}

export async function platformUpdatePublisherInvoice(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return { error: "Invoice not found." };
  const amount = parseMoney(formField(formData, "amount"), "Amount", true);
  const payable = parseMoney(formField(formData, "payable"), "Payable", true);
  const paid = parseMoney(formField(formData, "paid"), "Paid", false);
  if (!amount.ok) return { error: amount.error };
  if (!payable.ok) return { error: payable.error };
  if (!paid.ok) return { error: paid.error };

  await prisma.publisherInvoice.update({
    where: { id },
    data: {
      invoiceNumber: formField(formData, "invoiceNumber") || null,
      periodLabel: formField(formData, "periodLabel") || null,
      paymentStatus: (formField(formData, "paymentStatus") || PaymentStatus.UNPAID) as PaymentStatus,
      amount: amount.value!,
      payable: payable.value!,
      paid: paid.value,
      paymentMethod: formField(formData, "paymentMethod") || null,
    },
  });
  revalidateAdmin("/admin/publisher-invoices", `/admin/publisher-invoices/${id}`);
  return { ok: true };
}

export async function platformDeletePublisherInvoice(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return;
  await prisma.publisherInvoice.delete({ where: { id } });
  revalidateAdmin("/admin/publisher-invoices");
  return { ok: true };
}

export async function platformUpdateBuyer(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return { error: "Buyer not found." };
  await prisma.buyer.update({
    where: { id },
    data: {
      name: formField(formData, "name").trim(),
      email: formField(formData, "email").trim() || null,
      contactName: formField(formData, "contactName").trim() || null,
      address: formField(formData, "address").trim() || null,
      defaultTerms: formField(formData, "defaultTerms").trim() || null,
      defaultMethod: formField(formData, "defaultMethod").trim() || null,
    },
  });
  revalidateAdmin("/admin/buyers");
  return { ok: true };
}

export async function platformDeleteBuyer(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return;
  await prisma.buyer.delete({ where: { id } });
  revalidateAdmin("/admin/buyers");
  return { ok: true };
}

export async function platformUpdatePublisher(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return { error: "Publisher not found." };
  await prisma.publisher.update({
    where: { id },
    data: {
      name: formField(formData, "name").trim(),
      email: formField(formData, "email").trim() || null,
      contactName: formField(formData, "contactName").trim() || null,
      address: formField(formData, "address").trim() || null,
      defaultTerms: formField(formData, "defaultTerms").trim() || null,
      isInternal: formField(formData, "isInternal") === "on",
    },
  });
  revalidateAdmin("/admin/publishers");
  return { ok: true };
}

export async function platformDeletePublisher(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return;
  await prisma.publisher.delete({ where: { id } });
  revalidateAdmin("/admin/publishers");
  return { ok: true };
}

export async function platformUpdateExpense(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return { error: "Expense not found." };
  const paid = parseMoney(formField(formData, "paid"), "Paid", true);
  const actual = parseMoney(formField(formData, "actual"), "Actual", true);
  if (!paid.ok) return { error: paid.error };
  if (!actual.ok) return { error: actual.error };
  await prisma.expense.update({
    where: { id },
    data: {
      category: formField(formData, "category").trim() || "General",
      label: formField(formData, "label").trim() || null,
      year: Number(formField(formData, "year") || new Date().getFullYear()),
      month: Number(formField(formData, "month") || 1),
      paid: paid.value!,
      actual: actual.value!,
      notes: formField(formData, "notes").trim() || null,
      method: formField(formData, "method").trim() || null,
    },
  });
  revalidateAdmin("/admin/expenses");
  return { ok: true };
}

export async function platformDeleteExpense(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return;
  await prisma.expense.delete({ where: { id } });
  revalidateAdmin("/admin/expenses");
  return { ok: true };
}

export async function platformUpdatePartner(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return { error: "Partner not found." };
  const share = Number(formField(formData, "sharePercent") || 0);
  await prisma.partner.update({
    where: { id },
    data: {
      name: formField(formData, "name").trim(),
      tier: (formField(formData, "tier") || PartnerTier.EQUITY) as PartnerTier,
      sharePercent: share,
      isActive: formField(formData, "isActive") === "on",
    },
  });
  revalidateAdmin("/admin/partners");
  return { ok: true };
}

export async function platformDeletePartner(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return;
  await prisma.partner.delete({ where: { id } });
  revalidateAdmin("/admin/partners");
  return { ok: true };
}

export async function platformRevokeInvite(formData: FormData) {
  await requirePlatformAdmin();
  const id = formField(formData, "id");
  if (!id) return;
  await prisma.invite.delete({ where: { id } });
  revalidateAdmin("/admin/invites");
  return { ok: true };
}
