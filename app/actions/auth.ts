"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { createCompanyForUser, findExistingCompany } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import { TENANT_COOKIE } from "@/lib/tenant";
import { formField, parseCompanyIdentity, parseEmail, parsePassword, parsePersonName } from "@/lib/validation";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl || "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}

export async function signupAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const firstName = parsePersonName(formField(formData, "firstName"), "First name");
  if (!firstName.ok) return { error: firstName.error };
  const lastName = parsePersonName(formField(formData, "lastName"), "Last name");
  if (!lastName.ok) return { error: lastName.error };
  const email = parseEmail(formField(formData, "email"), true);
  if (!email.ok) return { error: email.error };
  const password = parsePassword(String(formData.get("password") ?? ""), String(formData.get("confirmPassword") ?? ""));
  if (!password.ok) return { error: password.error };

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
  if (!identity.ok) return { error: identity.error };

  if (await findExistingCompany(identity.value.name)) {
    return {
      error: "A company with this name already exists. Sign in and ask an admin for an invite, or choose a different name.",
    };
  }
  if (await prisma.user.findUnique({ where: { email: email.value as string } })) {
    return { error: "An account with this email already exists. Sign in instead." };
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
