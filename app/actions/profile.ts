"use server";

import { revalidatePath } from "next/cache";
import { resolveAvatarKey } from "@/lib/avatars";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { formField, parsePersonName } from "@/lib/validation";

export async function updateProfileAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireTenant();
  const nameRaw = formField(formData, "name").trim();
  let nameValue: string | null = null;
  if (nameRaw) {
    const name = parsePersonName(nameRaw, "Display name");
    if (!name.ok) return { error: name.error };
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
