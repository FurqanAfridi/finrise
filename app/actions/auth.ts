"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut, auth } from "@/auth";
import { createCompanyForUser, findExistingCompany } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import { isLocalDevHost, isPlatformAdminHost, platformAdminPublicUrl } from "@/lib/platform-host";
import { APP_NAME } from "@/lib/brand";
import { platformMailReady, sendPlatformMail } from "@/lib/platform-mail";
import { Role } from "@/lib/roles";
import { TENANT_COOKIE } from "@/lib/tenant";
import { formField, parseCompanyIdentity, parseEmail, parsePassword, parsePersonName } from "@/lib/validation";
import { identityInvalid, invalid, invalidResult, type FormActionState } from "@/lib/form-state";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");
  const safeCallback = callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/login?error=1");
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) redirect("/login?error=1");

  const host = (await headers()).get("host");
  const dest =
    user.role === Role.ADMIN
      ? isPlatformAdminHost(host) || isLocalDevHost(host)
        ? safeCallback.startsWith("/admin")
          ? safeCallback
          : "/admin"
        : `${platformAdminPublicUrl()}/admin`
      : safeCallback;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: dest,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}

export async function signupAction(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const firstName = parsePersonName(formField(formData, "firstName"), "First name");
  if (!firstName.ok) return invalid("firstName", firstName.error);
  const lastName = parsePersonName(formField(formData, "lastName"), "Last name");
  if (!lastName.ok) return invalid("lastName", lastName.error);
  const email = parseEmail(formField(formData, "email"), true);
  if (!email.ok) return invalid("email", email.error);
  const password = parsePassword(String(formData.get("password") ?? ""), String(formData.get("confirmPassword") ?? ""));
  if (!password.ok) {
    const field = password.error.includes("match") ? "confirmPassword" : "password";
    return invalid(field, password.error);
  }

  const identity = parseCompanyIdentity({
    name: formField(formData, "companyName"),
    country: formField(formData, "country"),
    phone: formField(formData, "phone"),
    address: formField(formData, "address"),
    zipCode: formField(formData, "zipCode"),
    email: email.value ?? undefined,
    bankName: formField(formData, "bankName"),
    bankAccountNumber: formField(formData, "bankAccountNumber"),
    bankRoutingNumber: formField(formData, "bankRoutingNumber"),
    bankIban: formField(formData, "bankIban"),
    bankSwift: formField(formData, "bankSwift"),
  });
  if (!identity.ok) return identityInvalid(identity, "companyName");

  if (await findExistingCompany(identity.value.name)) {
    return invalid(
      "companyName",
      "A company with this name already exists. Sign in and ask an admin for an invite, or choose a different name.",
    );
  }
  if (await prisma.user.findUnique({ where: { email: email.value as string } })) {
    return invalid("email", "An account with this email already exists. Sign in instead.");
  }

  const fullName = `${firstName.value} ${lastName.value}`;
  const user = await prisma.user.create({
    data: {
      email: email.value as string,
      name: fullName,
      passwordHash: await bcrypt.hash(password.value, 12),
    },
  });
  const result = await createCompanyForUser(user.id, {
    name: identity.value.name,
    email: identity.value.email,
    phone: identity.value.phone,
    address: identity.value.address,
    country: identity.value.country,
    zipCode: identity.value.zipCode,
    bank: identity.value.bank,
  });
  if ("error" in result) {
    await prisma.user.delete({ where: { id: user.id } });
    return { error: result.error };
  }

  const jar = await cookies();
  jar.set(TENANT_COOKIE, result.tenant.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  try {
    await signIn("credentials", {
      email: email.value as string,
      password: password.value,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login");
    }
    throw error;
  }
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function requestPasswordResetAction(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const email = parseEmail(formField(formData, "email"), true);
  if (!email.ok || !email.value) return invalid("email", email.ok ? "Enter the email for your account." : email.error);

  const user = await prisma.user.findUnique({ where: { email: email.value } });
  if (user) {
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });
    const site = (process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${site}/reset-password/${token}`;
    const year = new Date().getFullYear();
    if (platformMailReady()) {
      await sendPlatformMail({
        to: user.email,
        subject: `Reset your ${APP_NAME} password`,
        text: [
          `Reset your ${APP_NAME} password`,
          "",
          "Use this link within the next hour:",
          resetUrl,
          "",
          "If you did not ask for this, you can ignore the email. Your password stays the same.",
          "",
          `© ${year} ${APP_NAME}. Powered by Devdabs.`,
        ].join("\n"),
        html: `<p>Use this link within the next hour to choose a new password:</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not ask for this, you can ignore the email.</p><p style="color:#6B7785;font-size:12px;">© ${year} ${APP_NAME}. Powered by Devdabs.</p>`,
      });
    }
  }

  return { ok: true };
}

export async function completePasswordResetAction(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const token = formField(formData, "token");
  const password = parsePassword(String(formData.get("password") ?? ""), String(formData.get("confirmPassword") ?? ""));
  if (!token) return { error: "This reset link is missing. Request a new one from the sign-in page." };
  if (!password.ok) {
    const field = password.error.includes("match") ? "confirmPassword" : "password";
    return invalid(field, password.error);
  }

  const row = await prisma.passwordReset.findUnique({ where: { token } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await bcrypt.hash(password.value, 12) },
    }),
    prisma.passwordReset.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
