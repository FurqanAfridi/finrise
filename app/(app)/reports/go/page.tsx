import { redirect } from "next/navigation";
import type { ReportGrain } from "@/lib/finance/period";

export default async function ReportsGoPage({
  searchParams,
}: {
  searchParams: Promise<{ grain?: string; year?: string; part?: string }>;
}) {
  const params = await searchParams;
  const grain = (params.grain ?? "month") as ReportGrain;
  const year = Number(params.year) || new Date().getUTCFullYear();
  let part = Number(params.part) || 1;

  if (grain === "year") part = 1;
  if (grain === "quarter") part = Math.min(4, Math.max(1, part));
  if (grain === "month") part = Math.min(12, Math.max(1, part));
  if (grain === "week") part = Math.min(53, Math.max(1, part));

  redirect(`/reports/${grain}/${year}/${part}`);
}
