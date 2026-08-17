import ExcelJS from "exceljs";
import { IMPORT_FIELDS, type ImportKind } from "@/lib/import/table";

const SAMPLE_ROWS: Record<ImportKind, string[][]> = {
  buyers: [
    [
      "Acme Media",
      "Aug 1-15 2026",
      "2026-08-01",
      "2026-08-15",
      "Auto Insurance",
      "120",
      "CPL",
      "25",
      "3000",
      "INV-2026-0142",
      "NET 14",
      "2026-08-29",
      "UNPAID",
      "SENT",
      "3000",
      "",
      "",
      "",
    ],
    [
      "Northstar Leads",
      "Aug 16-31 2026",
      "2026-08-16",
      "2026-08-31",
      "Medicare",
      "80",
      "CPL",
      "40",
      "3200",
      "INV-2026-0148",
      "NET 14",
      "2026-09-14",
      "PAID",
      "SENT",
      "3200",
      "3200",
      "2026-09-10",
      "ACH",
    ],
  ],
  publishers: [
    [
      "River Traffic",
      "Aug 1-15 2026",
      "2026-08-01",
      "2026-08-15",
      "Auto Insurance",
      "90",
      "CPL",
      "12",
      "1080",
      "PAY-2026-0088",
      "NET 14",
      "2026-08-29",
      "UNPAID",
      "1080",
      "",
      "2026-W32",
      "2026-08",
    ],
    [
      "Peak Media Co",
      "Aug 16-31 2026",
      "2026-08-16",
      "2026-08-31",
      "Medicare",
      "70",
      "CPL",
      "18",
      "1260",
      "PAY-2026-0091",
      "NET 7",
      "2026-09-07",
      "PAID",
      "1260",
      "1260",
      "2026-W34",
      "2026-08",
    ],
  ],
  expenses: [
    ["2026", "8", "Software", "CRM subscription", "249", "249", "August tools"],
    ["2026", "8", "Payroll", "Ops contractor", "1800", "1800", ""],
  ],
};

const SHEET_NAMES: Record<ImportKind, string> = {
  buyers: "Buyer invoices",
  publishers: "Publisher payables",
  expenses: "Expenses",
};

function addDataSheet(workbook: ExcelJS.Workbook, kind: ImportKind) {
  const fields = IMPORT_FIELDS[kind];
  const sheet = workbook.addWorksheet(SHEET_NAMES[kind]);
  const header = fields.map((field) => field.label);
  sheet.addRow(header);
  for (const row of SAMPLE_ROWS[kind]) {
    sheet.addRow(row);
  }
  sheet.getRow(1).font = { bold: true };
  fields.forEach((field, index) => {
    const column = sheet.getColumn(index + 1);
    column.width = Math.min(28, Math.max(14, header[index].length + 2));
    if (field.required) {
      sheet.getRow(1).getCell(index + 1).note = "Required in FundLookup";
    }
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

export async function buildSampleImportWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FundLookup";
  workbook.created = new Date();

  const info = workbook.addWorksheet("How to import");
  info.getColumn(1).width = 92;
  const lines = [
    "FundLookup sample import workbook",
    "",
    "Use these three tabs as a template for Google Sheets, Excel, or CSV.",
    "Keep the header row. You can rename columns, then match them in Import.",
    "Required buyer columns: Buyer name, Total amount.",
    "Required publisher columns: Publisher name, Total amount.",
    "Required expense columns: Year, Month (1 to 12), Category, Amount.",
    "Extra columns are ignored.",
    "Dates work best as YYYY-MM-DD. Amounts can include a $ sign.",
    "Payment status examples: UNPAID, PAID, ON_HOLD.",
    "Invoice status examples: SENT, NOT_SENT.",
    "Rate type examples: CPL, CPA, FLAT, OTHER.",
    "",
    "Buyer invoices: each row is one historical invoice to collect from a buyer.",
    "Publisher payables: each row is one historical payable to pay a publisher.",
    "Expenses: each row is one cost in a calendar month (month is 1 to 12).",
    "",
    "In FundLookup open Integrations, download this file if you need a fresh copy,",
    "then pick the matching import type and map columns. Run a dry run before save.",
  ];
  lines.forEach((line) => info.addRow([line]));
  info.getRow(1).font = { bold: true, size: 14 };

  addDataSheet(workbook, "buyers");
  addDataSheet(workbook, "publishers");
  addDataSheet(workbook, "expenses");

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
