import { NextResponse } from "next/server";
import { buildSampleImportWorkbook } from "@/lib/import/sample-workbook";
import { requireBrokerOps } from "@/lib/tenant";

export async function GET() {
  await requireBrokerOps();
  const file = await buildSampleImportWorkbook();
  return new NextResponse(Uint8Array.from(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="FundLookup-import-sample.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}
