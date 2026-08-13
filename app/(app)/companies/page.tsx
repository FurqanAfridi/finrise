import { redirect } from "next/navigation";

export default function CompaniesRedirectPage() {
  redirect("/settings?tab=companies");
}
