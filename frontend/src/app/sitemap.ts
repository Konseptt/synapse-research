import type { MetadataRoute } from "next";

import { siteConfig, absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/search"), lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: absoluteUrl("/upload"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/graph"), lastModified: now, changeFrequency: "weekly", priority: 0.75 },
  ];
  return routes;
}
