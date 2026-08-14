import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MarketingLander } from "@/components/marketing/lander";
import { isMarketingHost } from "@/lib/platform-host";

export default async function HomePage() {
  const host = (await headers()).get("host");
  if (isMarketingHost(host)) {
    return <MarketingLander />;
  }
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
}
