import { randomBytes } from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/secret";
import { parseEmail, parseInteger } from "@/lib/validation";

export type SmtpMailboxPublic = {
  id: string;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string;
  isDefault: boolean;
  hasPassword: boolean;
  configured: boolean;
};

type SmtpRow = {
  id: string;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  passwordEnc: string;
  fromEmail: string;
  fromName: string | null;
  isDefault: boolean;
};

function toPublic(row: SmtpRow): SmtpMailboxPublic {
  return {
    id: row.id,
    label: row.label,
    host: row.host,
    port: row.port,
    secure: row.secure,
    username: row.username,
    fromEmail: row.fromEmail,
    fromName: row.fromName ?? "",
    isDefault: row.isDefault,
    hasPassword: Boolean(row.passwordEnc),
    configured: Boolean(row.host && row.username && row.passwordEnc && row.fromEmail),
  };
}

function newId() {
  return `mb${randomBytes(12).toString("hex")}`;
}

export async function listSmtpMailboxes(tenantId: string): Promise<SmtpMailboxPublic[]> {
  const rows = await prisma.$queryRaw<SmtpRow[]>`
    SELECT id, label, host, port, secure, username, "passwordEnc", "fromEmail", "fromName", "isDefault"
    FROM "SmtpMailbox"
    WHERE "tenantId" = ${tenantId}
    ORDER BY "isDefault" DESC, "createdAt" ASC
  `;
  return rows.map(toPublic);
}

/** @deprecated Prefer listSmtpMailboxes — kept for callers that expect a single summary. */
export async function getSmtpPublic(tenantId: string): Promise<SmtpMailboxPublic | null> {
  const rows = await listSmtpMailboxes(tenantId);
  return rows.find((row) => row.isDefault) ?? rows[0] ?? null;
}

export async function saveSmtpMailbox(
  tenantId: string,
  input: {
    id?: string;
    label: string;
    host: string;
    port: string;
    secure: boolean;
    username: string;
    password: string;
    fromEmail: string;
    fromName: string;
    makeDefault?: boolean;
  },
) {
  const label = input.label.trim() || "Mailbox";
  const host = input.host.trim();
  if (!host) return { error: "SMTP host is required.", field: "host" } as const;
  const port = parseInteger(input.port || "587", "SMTP port", 1, 65535, true);
  if (!port.ok || port.value == null) return { error: port.ok ? "SMTP port is required." : port.error, field: "port" } as const;
  const username = input.username.trim();
  if (!username) return { error: "SMTP username is required.", field: "username" } as const;
  const fromEmail = parseEmail(input.fromEmail, true);
  if (!fromEmail.ok || !fromEmail.value) {
    return { error: fromEmail.ok ? "From email is required." : fromEmail.error, field: "fromEmail" } as const;
  }

  const existingId = input.id?.trim() || null;
  let passwordEnc: string | null = null;
  if (existingId) {
    const existing = await prisma.$queryRaw<{ passwordEnc: string }[]>`
      SELECT "passwordEnc" FROM "SmtpMailbox" WHERE id = ${existingId} AND "tenantId" = ${tenantId} LIMIT 1
    `;
    if (!existing[0]) return { error: "Mailbox not found." } as const;
    const password = input.password.trim();
    if (!password && !existing[0].passwordEnc) {
      return { error: "SMTP password is required.", field: "password" } as const;
    }
    passwordEnc = password ? encryptSecret(password) : existing[0].passwordEnc;
  } else {
    const password = input.password.trim();
    if (!password) return { error: "SMTP password is required.", field: "password" } as const;
    passwordEnc = encryptSecret(password);
  }

  const fromName = input.fromName.trim() || null;
  const secure = input.secure;
  const now = new Date();
  const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "SmtpMailbox" WHERE "tenantId" = ${tenantId}
  `;
  const count = Number(countRows[0]?.count ?? 0);
  const makeDefault = input.makeDefault === true || count === 0 || (!existingId && count === 0);

  if (makeDefault) {
    await prisma.$executeRaw`
      UPDATE "SmtpMailbox" SET "isDefault" = false WHERE "tenantId" = ${tenantId}
    `;
  }

  if (existingId) {
    await prisma.$executeRaw`
      UPDATE "SmtpMailbox"
      SET
        label = ${label},
        host = ${host},
        port = ${port.value},
        secure = ${secure},
        username = ${username},
        "passwordEnc" = ${passwordEnc},
        "fromEmail" = ${fromEmail.value},
        "fromName" = ${fromName},
        "isDefault" = CASE WHEN ${makeDefault} THEN true ELSE "isDefault" END,
        "updatedAt" = ${now}
      WHERE id = ${existingId} AND "tenantId" = ${tenantId}
    `;
    return { ok: true, id: existingId } as const;
  }

  const id = newId();
  await prisma.$executeRaw`
    INSERT INTO "SmtpMailbox" (
      id, "tenantId", label, host, port, secure, username, "passwordEnc",
      "fromEmail", "fromName", "isDefault", "createdAt", "updatedAt"
    )
    VALUES (
      ${id}, ${tenantId}, ${label}, ${host}, ${port.value}, ${secure}, ${username}, ${passwordEnc},
      ${fromEmail.value}, ${fromName}, ${makeDefault || count === 0}, ${now}, ${now}
    )
  `;
  return { ok: true, id } as const;
}

export async function deleteSmtpMailbox(tenantId: string, mailboxId: string) {
  const rows = await prisma.$queryRaw<{ id: string; isDefault: boolean }[]>`
    SELECT id, "isDefault" FROM "SmtpMailbox" WHERE id = ${mailboxId} AND "tenantId" = ${tenantId} LIMIT 1
  `;
  if (!rows[0]) return { error: "Mailbox not found." } as const;
  await prisma.$executeRaw`
    DELETE FROM "SmtpMailbox" WHERE id = ${mailboxId} AND "tenantId" = ${tenantId}
  `;
  if (rows[0].isDefault) {
    await prisma.$executeRaw`
      UPDATE "SmtpMailbox"
      SET "isDefault" = true
      WHERE id = (
        SELECT id FROM "SmtpMailbox" WHERE "tenantId" = ${tenantId} ORDER BY "createdAt" ASC LIMIT 1
      )
    `;
  }
  return { ok: true } as const;
}

export async function setDefaultSmtpMailbox(tenantId: string, mailboxId: string) {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "SmtpMailbox" WHERE id = ${mailboxId} AND "tenantId" = ${tenantId} LIMIT 1
  `;
  if (!rows[0]) return { error: "Mailbox not found." } as const;
  await prisma.$executeRaw`
    UPDATE "SmtpMailbox" SET "isDefault" = false WHERE "tenantId" = ${tenantId}
  `;
  await prisma.$executeRaw`
    UPDATE "SmtpMailbox" SET "isDefault" = true, "updatedAt" = ${new Date()}
    WHERE id = ${mailboxId} AND "tenantId" = ${tenantId}
  `;
  return { ok: true } as const;
}

async function transporterFor(tenantId: string, mailboxId?: string | null) {
  const rows = mailboxId
    ? await prisma.$queryRaw<SmtpRow[]>`
        SELECT id, label, host, port, secure, username, "passwordEnc", "fromEmail", "fromName", "isDefault"
        FROM "SmtpMailbox"
        WHERE "tenantId" = ${tenantId} AND id = ${mailboxId}
        LIMIT 1
      `
    : await prisma.$queryRaw<SmtpRow[]>`
        SELECT id, label, host, port, secure, username, "passwordEnc", "fromEmail", "fromName", "isDefault"
        FROM "SmtpMailbox"
        WHERE "tenantId" = ${tenantId}
        ORDER BY "isDefault" DESC, "createdAt" ASC
        LIMIT 1
      `;
  const row = rows[0];
  if (!row?.host || !row.passwordEnc) {
    return { error: "Add a mailbox in Settings → Email before sending invoices." } as const;
  }
  const transporter = nodemailer.createTransport({
    host: row.host,
    port: row.port,
    secure: row.secure || row.port === 465,
    auth: {
      user: row.username,
      pass: decryptSecret(row.passwordEnc),
    },
  });
  return {
    transporter,
    from: row.fromName ? `${row.fromName} <${row.fromEmail}>` : row.fromEmail,
    settings: row,
  };
}

export async function sendSmtpMail(
  tenantId: string,
  message: {
    to: string;
    subject: string;
    text: string;
    html: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
    mailboxId?: string | null;
  },
) {
  const ready = await transporterFor(tenantId, message.mailboxId);
  if ("error" in ready) return ready;
  await ready.transporter.sendMail({
    from: ready.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: message.attachments?.map((file) => ({
      filename: file.filename,
      content: file.content,
      contentType: file.contentType ?? "application/pdf",
    })),
  });
  return { ok: true, mailboxId: ready.settings.id } as const;
}

export async function verifySmtp(tenantId: string, mailboxId?: string | null) {
  const ready = await transporterFor(tenantId, mailboxId);
  if ("error" in ready) return ready;
  await ready.transporter.verify();
  return { ok: true } as const;
}

export async function logInvoiceEmail(input: {
  tenantId: string;
  buyerInvoiceId?: string | null;
  toEmail: string;
  subject: string;
  status: "SENT" | "FAILED";
  error?: string | null;
  sentById?: string | null;
}) {
  await prisma.$executeRaw`
    INSERT INTO "InvoiceEmailLog" (
      id, "tenantId", "buyerInvoiceId", "toEmail", subject, status, error, "sentById", "createdAt"
    )
    VALUES (
      ${`cml${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`},
      ${input.tenantId},
      ${input.buyerInvoiceId ?? null},
      ${input.toEmail},
      ${input.subject},
      CAST(${input.status} AS "EmailSendStatus"),
      ${input.error ?? null},
      ${input.sentById ?? null},
      ${new Date()}
    )
  `;
}

export type EmailLogRow = {
  id: string;
  toEmail: string;
  subject: string;
  status: "SENT" | "FAILED";
  error: string | null;
  createdAt: Date;
  invoiceNumber: string | null;
  sentByEmail: string | null;
};

export async function listInvoiceEmailLogs(tenantId: string): Promise<EmailLogRow[]> {
  return prisma.$queryRaw<EmailLogRow[]>`
    SELECT
      l.id,
      l."toEmail",
      l.subject,
      l.status,
      l.error,
      l."createdAt",
      i."invoiceNumber",
      u.email AS "sentByEmail"
    FROM "InvoiceEmailLog" l
    LEFT JOIN "BuyerInvoice" i ON i.id = l."buyerInvoiceId"
    LEFT JOIN "User" u ON u.id = l."sentById"
    WHERE l."tenantId" = ${tenantId}
    ORDER BY l."createdAt" DESC
    LIMIT 25
  `;
}

/** Back-compat alias used by older call sites during transition. */
export async function saveSmtpSettings(
  tenantId: string,
  input: {
    host: string;
    port: string;
    secure: boolean;
    username: string;
    password: string;
    fromEmail: string;
    fromName: string;
  },
) {
  return saveSmtpMailbox(tenantId, {
    label: input.fromName.trim() || "Mailbox",
    ...input,
    makeDefault: true,
  });
}
