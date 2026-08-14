"use server";

import { revalidatePath } from "next/cache";
import { resolveAvatarKey } from "@/lib/avatars";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { formField, parsePersonName } from "@/lib/validation";
import type { FormActionState } from "@/lib/form-state";

export async function updateProfileAction(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const ctx = await requireTenant();
  const nameRaw = formField(formData, "name").trim();
  let nameValue: string | null = null;
  if (nameRaw) {
    const name = parsePersonName(nameRaw, "Display name");
    if (!name.ok) return { error: name.error, fieldErrors: { name: name.error } };
    nameValue = name.value;
  }

  const avatarKey = resolveAvatarKey(formField(formData, "avatarKey") || null);

  await prisma.$executeRaw`
    UPDATE "User"
    SET name = ${nameValue}, "avatarKey" = ${avatarKey}
    WHERE id = ${ctx.userId}
  `;

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { ok: true };
}
