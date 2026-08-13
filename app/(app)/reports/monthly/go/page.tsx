import { redirect } from "next/navigation";

export default async function MonthGo({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  redirect(`/reports/monthly/${params.year ?? new Date().getUTCFullYear()}/${params.month ?? 1}`);
}
