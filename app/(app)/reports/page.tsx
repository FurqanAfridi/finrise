import { redirect } from "next/navigation";
import { listMonthKeys } from "@/lib/finance/queries";
import { requireBrokerOps } from "@/lib/tenant";

export default async function ReportsIndexPage() {
  const ctx = await requireBrokerOps();
  const keys = await listMonthKeys(ctx.tenantId);
  const now = new Date();
  const target = keys[0] ?? { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  redirect(`/reports/monthly/${target.year}/${target.month}`);
}
