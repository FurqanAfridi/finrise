"use server";

import { revalidatePath } from "next/cache";
import { importHistoricalRows, type ImportRunResult } from "@/lib/import/historical";
import { parseExcelWorkbook } from "@/lib/import/excel";
import {
  applyColumnMapping,
  mappingIsValid,
  parseCsvTable,
  type ImportKind,
} from "@/lib/import/table";
import {
  disconnectGoogleSheets,
  googleSheetsConfigured,
  listGoogleSheetTabs,
  listGoogleSpreadsheets,
  readGoogleSheetValues,
} from "@/lib/google-sheets";
import { prisma } from "@/lib/prisma";
import { requireBrokerOps } from "@/lib/tenant";

export type SheetPreview = {
  error?: string;
  sheets?: string[];
  sheet?: string;
  headers?: string[];
  preview?: string[][];
  rowCount?: number;
};

function parseKind(raw: string): ImportKind | null {
  if (raw === "buyers" || raw === "publishers" || raw === "expenses") return raw;
  return null;
}

function parseMapping(raw: unknown): Record<string, number> | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const value = JSON.parse(raw) as Record<string, number>;
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

async function finish(tenantId: string, result: ImportRunResult, commit: boolean) {
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
    revalidatePath("/integrations");
    revalidatePath("/settings");
    revalidatePath("/buyers");
    revalidatePath("/publishers");
    revalidatePath("/expenses");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function disconnectGoogleSheetsAction() {
  const ctx = await requireBrokerOps();
  await disconnectGoogleSheets(ctx.tenantId);
  revalidatePath("/integrations");
}

export async function listGoogleSpreadsheetsAction(): Promise<{
  error?: string;
  files?: { id: string; name: string }[];
}> {
  const ctx = await requireBrokerOps();
  if (!googleSheetsConfigured()) {
    return { error: "Google Sheets is not configured on this server yet." };
  }
  try {
    const files = await listGoogleSpreadsheets(ctx.tenantId);
    return { files: files.map((file) => ({ id: file.id, name: file.name })) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not list Google Sheets." };
  }
}

export async function listGoogleSheetTabsAction(spreadsheetId: string): Promise<{
  error?: string;
  tabs?: string[];
}> {
  const ctx = await requireBrokerOps();
  if (!spreadsheetId) return { error: "Choose a spreadsheet." };
  try {
    const tabs = await listGoogleSheetTabs(ctx.tenantId, spreadsheetId);
    return { tabs: tabs.map((tab) => tab.title) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not read that spreadsheet." };
  }
}

export async function previewGoogleSheetAction(
  spreadsheetId: string,
  sheetTitle: string,
): Promise<SheetPreview> {
  const ctx = await requireBrokerOps();
  if (!spreadsheetId || !sheetTitle) return { error: "Choose a spreadsheet and a sheet tab." };
  try {
    const table = await readGoogleSheetValues(ctx.tenantId, spreadsheetId, sheetTitle, 12);
    return {
      sheet: sheetTitle,
      headers: table.headers,
      preview: table.rows.slice(0, 5),
      rowCount: table.rows.length,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not read that sheet." };
  }
}

export async function previewUploadedWorkbookAction(formData: FormData): Promise<SheetPreview> {
  await requireBrokerOps();
  const file = formData.get("file");
  const requestedSheet = String(formData.get("sheet") ?? "");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV or Excel file." };
  if (file.size > 8 * 1024 * 1024) return { error: "Keep the file under 8 MB." };
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".csv") || file.type.includes("csv") || file.type === "text/plain") {
      const table = parseCsvTable(await file.text());
      return {
        sheets: ["CSV"],
        sheet: "CSV",
        headers: table.headers,
        preview: table.rows.slice(0, 5),
        rowCount: table.rows.length,
      };
    }
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      return { error: "Upload a .csv or .xlsx file." };
    }
    const parsed = await parseExcelWorkbook(await file.arrayBuffer());
    if (parsed.sheets.length === 0) return { error: "That workbook has no header row." };
    const sheet =
      parsed.sheets.find((row) => row.name === requestedSheet) ?? parsed.sheets[0];
    return {
      sheets: parsed.sheets.map((row) => row.name),
      sheet: sheet.name,
      headers: sheet.headers,
      preview: sheet.rows.slice(0, 5),
      rowCount: sheet.rows.length,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not read that file." };
  }
}

export async function importGoogleSheetAction(
  _prev: ImportRunResult,
  formData: FormData,
): Promise<ImportRunResult> {
  const ctx = await requireBrokerOps();
  const kind = parseKind(String(formData.get("kind") ?? ""));
  if (!kind) return { error: "Choose what to import." };
  const commit = String(formData.get("mode")) === "commit";
  const spreadsheetId = String(formData.get("spreadsheetId") ?? "");
  const sheetTitle = String(formData.get("sheetTitle") ?? "");
  const mapping = parseMapping(formData.get("mapping"));
  if (!spreadsheetId || !sheetTitle) return { error: "Choose a spreadsheet and a sheet tab." };
  if (!mapping || !mappingIsValid(kind, mapping)) {
    return { error: "Match every required field to a column in the sheet." };
  }
  try {
    const table = await readGoogleSheetValues(ctx.tenantId, spreadsheetId, sheetTitle);
    const rows = applyColumnMapping(table.rows, mapping);
    const result = await importHistoricalRows({
      tenantId: ctx.tenantId,
      kind,
      rows,
      commit,
      sourceLabel: "Google Sheets import",
    });
    return finish(ctx.tenantId, result, commit);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not import that sheet." };
  }
}

export async function importUploadedWorkbookAction(
  _prev: ImportRunResult,
  formData: FormData,
): Promise<ImportRunResult> {
  const ctx = await requireBrokerOps();
  const kind = parseKind(String(formData.get("kind") ?? ""));
  if (!kind) return { error: "Choose what to import." };
  const commit = String(formData.get("mode")) === "commit";
  const mapping = parseMapping(formData.get("mapping"));
  if (!mapping || !mappingIsValid(kind, mapping)) {
    return { error: "Match every required field to a column in the file." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV or Excel file." };
  const requestedSheet = String(formData.get("sheet") ?? "");
  const name = file.name.toLowerCase();
  try {
    let headers: string[] = [];
    let dataRows: string[][] = [];
    if (name.endsWith(".csv") || file.type.includes("csv") || file.type === "text/plain") {
      const table = parseCsvTable(await file.text());
      headers = table.headers;
      dataRows = table.rows;
    } else {
      const parsed = await parseExcelWorkbook(await file.arrayBuffer());
      const sheet = parsed.sheets.find((row) => row.name === requestedSheet) ?? parsed.sheets[0];
      if (!sheet) return { error: "That workbook has no header row." };
      headers = sheet.headers;
      dataRows = sheet.rows;
    }
    if (!headers.length || dataRows.length === 0) {
      return { error: "No data rows found. Include a header line and at least one row." };
    }
    const rows = applyColumnMapping(dataRows, mapping);
    const result = await importHistoricalRows({
      tenantId: ctx.tenantId,
      kind,
      rows,
      commit,
      sourceLabel: "Spreadsheet import",
    });
    return finish(ctx.tenantId, result, commit);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not import that file." };
  }
}
