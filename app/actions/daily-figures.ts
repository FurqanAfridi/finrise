"use server";

import { revalidatePath } from "next/cache";
import {
  copyYesterdayFigures,
  generateDueDraftInvoices,
  removeDailyFigure,
  upsertDailyFigure,
} from "@/lib/daily-figures";
import { invalid, type FormActionState } from "@/lib/form-state";
import { requireBrokerOps } from "@/lib/tenant";
import { formField, parseFormDate, parseMoney, parseOptionalText } from "@/lib/validation";

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function revalidateContact(kind: string, contactId: string) {
  revalidatePath("/directory");
  revalidatePath("/buyers");
  revalidatePath("/publishers");
  revalidatePath("/dashboard");
  revalidatePath("/figures");
  if (kind === "publisher") {
    revalidatePath(`/directory/publishers/${contactId}`);
  } else {
    revalidatePath(`/directory/buyers/${contactId}`);
  }
}

export async function upsertDailyFigureAction(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const ctx = await requireBrokerOps();
  const kind = str(formData, "kind");
  const contactId = str(formData, "contactId");
  const verticalId = str(formData, "verticalId");
  if (kind !== "buyer" && kind !== "publisher") return invalid("kind", "Choose a contact type.");
  if (!contactId) return { error: "Contact is missing." };
  if (!verticalId) return invalid("verticalId", "Choose a vertical.");
  const figureDate = parseFormDate(formField(formData, "figureDate"), "Date", true);
  if (!figureDate.ok || !figureDate.value) {
    return invalid("figureDate", figureDate.ok ? "Date is required." : figureDate.error);
  }
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (figureDate.value.getTime() > todayUtc.getTime()) {
    return invalid("figureDate", "Choose today or a past date.");
  }
  const quantity = parseMoney(formField(formData, "quantity"), "Calls / leads", true);
  if (!quantity.ok || quantity.value == null) {
    return invalid("quantity", quantity.ok ? "Enter calls or leads." : quantity.error);
  }
  if (quantity.value < 0) return invalid("quantity", "Calls / leads cannot be negative.");
  const notes = parseOptionalText(formField(formData, "notes"), "Notes", 200);
  if (!notes.ok) return invalid("notes", notes.error);

  const saved = await upsertDailyFigure({
    tenantId: ctx.tenantId,
    kind,
    contactId,
    verticalId,
    figureDate: figureDate.value,
    quantity: quantity.value,
    notes: notes.value,
  });
  if (!saved.ok) return { error: saved.error };
  await generateDueDraftInvoices(ctx.tenantId, { kind, id: contactId });
  revalidateContact(kind, contactId);
  return { ok: true };
}

export async function copyYesterdayFiguresAction(formData: FormData) {
  const ctx = await requireBrokerOps();
  const kind = str(formData, "kind");
  const contactId = str(formData, "contactId");
  if (kind !== "buyer" && kind !== "publisher") return;
  if (!contactId) return;
  await copyYesterdayFigures(ctx.tenantId, kind, contactId);
  await generateDueDraftInvoices(ctx.tenantId, { kind, id: contactId });
  revalidateContact(kind, contactId);
}

export async function removeDailyFigureAction(formData: FormData) {
  const ctx = await requireBrokerOps();
  const kind = str(formData, "kind");
  const contactId = str(formData, "contactId");
  const figureId = str(formData, "figureId");
  if (kind !== "buyer" && kind !== "publisher") return;
  if (!contactId || !figureId) return;
  await removeDailyFigure(ctx.tenantId, kind, figureId);
  revalidateContact(kind, contactId);
}

export async function generateCycleDraftsAction(formData: FormData) {
  const ctx = await requireBrokerOps();
  const kind = str(formData, "kind");
  const contactId = str(formData, "contactId");
  if (kind !== "buyer" && kind !== "publisher") {
    await generateDueDraftInvoices(ctx.tenantId);
    revalidatePath("/directory");
    revalidatePath("/buyers");
    revalidatePath("/publishers");
    revalidatePath("/dashboard");
    revalidatePath("/figures");
    return;
  }
  if (!contactId) return;
  await generateDueDraftInvoices(ctx.tenantId, { kind, id: contactId });
  revalidateContact(kind, contactId);
}
