"use server";

import { revalidatePath } from "next/cache";
import { importHistoricalRows, type ImportRunResult } from "@/lib/import/historical";
import {
  applyColumnMapping,
  parseCsvTable,
  rowsFromNamedHeaders,
  type ImportKind,
} from "@/lib/import/table";
import { prisma } from "@/lib/prisma";
import { requireBrokerOps } from "@/lib/tenant";

export type ImportCsvResult = ImportRunResult;

function parseKind(raw: string): ImportKind | null {
  if (raw === "buyers" || raw === "publishers" || raw === "expenses") return raw;
  return null;
}

function parseMapping(raw: string): Record<string, number> | null {
  if (!raw.trim()) return null;
  try {
    const value = JSON.parse(raw) as Record<string, number>;
    if (!value || typeof value !== "object") return null;
    return value;
  } catch {
    return null;
  }
}

async function finishImport(tenantId: string, result: ImportRunResult, commit: boolean) {
  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId, key: "lastCsvImport" } },
    update: { value: JSON.stringify({ ...result, at: new Date().toISOString() }) },
    create: {
      tenantId,
      key: "lastCsvImport",
      value: JSON.stringify({ ...result, at: new Date().toISOString() }),
    },
  });
  if (commit && result.ok) {
    revalidatePath("/settings");
    revalidatePath("/integrations");
    revalidatePath("/buyers");
    revalidatePath("/publishers");
    revalidatePath("/expenses");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function importCsvAction(
  _prev: ImportCsvResult,
  formData: FormData,
): Promise<ImportCsvResult> {
  const ctx = await requireBrokerOps();
  const kind = parseKind(String(formData.get("kind") ?? "buyers"));
  if (!kind) return { error: "Choose what to import." };
  const commit = String(formData.get("mode")) === "commit";
  const csv = String(formData.get("csv") ?? "");
  if (!csv.trim()) return { error: "Paste CSV rows before running the import." };

  const table = parseCsvTable(csv);
  if (table.rows.length === 0) {
    return { error: "No data rows found. Include a header line and at least one row." };
  }

  const mapping = parseMapping(String(formData.get("mapping") ?? ""));
  const rows = mapping
    ? applyColumnMapping(table.rows, mapping)
    : rowsFromNamedHeaders(table.headers, table.rows);

  const result = await importHistoricalRows({
    tenantId: ctx.tenantId,
    kind,
    rows,
    commit,
    sourceLabel: "CSV import",
  });
  return finishImport(ctx.tenantId, result, commit);
}
