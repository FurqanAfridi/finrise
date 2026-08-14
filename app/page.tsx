import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MarketingLander } from "@/components/marketing/lander";
import { APP_NAME, APP_PURPOSE } from "@/lib/brand";
import { isMarketingHost } from "@/lib/platform-host";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host");
  if (isMarketingHost(host)) {
    return {
      title: APP_NAME,
      applicationName: APP_NAME,
      description: APP_PURPOSE,
    };
  }
  return { title: APP_NAME };
}

export default async function HomePage() {
  const host = (await headers()).get("host");
  if (isMarketingHost(host)) {
    return <MarketingLander />;
  }
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
}
