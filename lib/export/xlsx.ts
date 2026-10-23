import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export type ExportCell = string | number | Date | null | undefined;

export type ExportColumn = {
  header: string;
  width?: number;
  /** money → 2 decimals with thousands separators; rate → up to 4 decimals; date → yyyy-mm-dd; count → whole number. */
  format?: "money" | "rate" | "date" | "count";
};

export type ExportSheet = {
  name: string;
  columns: ExportColumn[];
  rows: ExportCell[][];
  /** Bold totals row appended under the data. */
  totals?: ExportCell[];
};

const NUM_FMT = { money: "#,##0.00", rate: "#,##0.00##", date: "yyyy-mm-dd", count: "#,##0" } as const;

/** Builds an .xlsx file: bold frozen header, typed number/date cells, optional totals row. */
export async function buildWorkbook(sheets: ExportSheet[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FundLookup";
  workbook.created = new Date();

  for (const sheet of sheets) {
    // Excel caps sheet names at 31 characters and bans a few symbols.
    const ws = workbook.addWorksheet(sheet.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31), {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = sheet.columns.map((column) => ({
      header: column.header,
      width: column.width ?? (column.format ? 14 : 20),
      style: column.format ? { numFmt: NUM_FMT[column.format] } : {},
    }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F0EC" } };

    for (const row of sheet.rows) ws.addRow(row.map((cell) => cell ?? null));
    if (sheet.totals) ws.addRow(sheet.totals.map((cell) => cell ?? null)).font = { bold: true };
    if (sheet.rows.length > 0) {
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function xlsxResponse(filename: string, sheets: ExportSheet[]) {
  const file = await buildWorkbook(sheets);
  return new NextResponse(Uint8Array.from(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Sum of one numeric column, for a totals row. */
export function columnTotal(rows: ExportCell[][], index: number) {
  return Math.round(rows.reduce((sum, row) => sum + (typeof row[index] === "number" ? row[index] : 0), 0) * 100) / 100;
}

/** Date-stamped filename, e.g. `payables-2026-10-23.xlsx`. */
export function exportFilename(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
}
