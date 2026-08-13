import { redirect } from "next/navigation";

export default async function PnlRedirect({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ?? now.getUTCFullYear();
  const month = params.month ?? now.getUTCMonth() + 1;
  redirect(`/reports/monthly/${year}/${month}`);
}
