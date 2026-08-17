import type { MetadataRoute } from "next";
import { marketingSiteUrl } from "@/lib/platform-host";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = marketingSiteUrl();
  return [
    { url: base, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.8 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.8 },
    { url: `${base}/data-deletion`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.8 },
  ];
}
