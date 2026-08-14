import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { marketingSiteUrl, isMarketingHost } from "@/lib/platform-host";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");
  const sitemap = `${marketingSiteUrl()}/sitemap.xml`;

  if (isMarketingHost(host)) {
    return {
      rules: {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/api/", "/dashboard", "/admin", "/login", "/signup"],
      },
      sitemap,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: ["/privacy", "/terms"],
      disallow: "/",
    },
    sitemap,
  };
}
