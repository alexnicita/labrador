import type { MetadataRoute } from "next";

import { AI_DISCOVERY_PATHS, getAbsoluteUrl } from "@/lib/site-url";

const lastModified = new Date("2026-05-23T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getAbsoluteUrl("/"),
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    ...AI_DISCOVERY_PATHS.map((path) => ({
      url: getAbsoluteUrl(path),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: path === "/llms.txt" ? 0.9 : 0.7,
    })),
  ];
}
