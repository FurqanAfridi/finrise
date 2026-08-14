import ExcelJS from "exceljs";

function cellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }
  if (typeof value === "object" && "result" in value) {
    return cellText(value.result as ExcelJS.CellValue);
  }
  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text ?? "").join("").trim();
  }
  return String(value).trim();
}

export async function parseExcelWorkbook(buffer: ArrayBuffer | Buffer): Promise<{
  sheets: { name: string; headers: string[]; rows: string[][] }[];
}> {
  const workbook = new ExcelJS.Workbook();
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
  await workbook.xlsx.load(bytes as unknown as ArrayBuffer);
  const sheets = workbook.worksheets.map((sheet) => {
    const matrix: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      const count = row.cellCount;
      for (let i = 1; i <= count; i += 1) {
        cells.push(cellText(row.getCell(i).value));
      }
      if (cells.some((cell) => cell)) matrix.push(cells);
    });
    const headers = matrix[0] ?? [];
    const rows = matrix.slice(1);
    return { name: sheet.name, headers, rows };
  });
  return { sheets: sheets.filter((sheet) => sheet.headers.length > 0) };
}
