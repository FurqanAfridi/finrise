import nodemailer from "nodemailer";

export const INVITE_FROM_EMAIL = process.env.INVITE_FROM_EMAIL?.trim() || "info@ridgerisemedia.com";
export const INVITE_FROM_NAME = process.env.INVITE_FROM_NAME?.trim() || "RidgeRise Media";

function platformSmtpConfigured() {
  return Boolean(
    process.env.PLATFORM_SMTP_HOST?.trim() &&
      process.env.PLATFORM_SMTP_USER?.trim() &&
      process.env.PLATFORM_SMTP_PASS?.trim(),
  );
}

export function platformMailReady() {
  return platformSmtpConfigured();
}

async function platformTransporter() {
  if (!platformSmtpConfigured()) {
    return {
      error:
        "Platform mailbox is not configured. Set PLATFORM_SMTP_HOST, PLATFORM_SMTP_USER, and PLATFORM_SMTP_PASS.",
    } as const;
  }
  const port = Number(process.env.PLATFORM_SMTP_PORT || "587");
  const secure =
    process.env.PLATFORM_SMTP_SECURE === "true" || port === 465;
  const transporter = nodemailer.createTransport({
    host: process.env.PLATFORM_SMTP_HOST!.trim(),
    port,
    secure,
    auth: {
      user: process.env.PLATFORM_SMTP_USER!.trim(),
      pass: process.env.PLATFORM_SMTP_PASS!,
    },
  });
  return { transporter } as const;
}

export async function sendPlatformMail(message: {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}) {
  const ready = await platformTransporter();
  if ("error" in ready) return ready;
  const from = `${INVITE_FROM_NAME} <${INVITE_FROM_EMAIL}>`;
  const to = Array.isArray(message.to) ? message.to.join(", ") : message.to;
  await ready.transporter.sendMail({
    from,
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    replyTo: message.replyTo || INVITE_FROM_EMAIL,
  });
  return { ok: true } as const;
}
