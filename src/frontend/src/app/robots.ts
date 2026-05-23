import type { MetadataRoute } from "next";

import { AI_DISCOVERY_PATHS, getAbsoluteUrl, getSiteUrl } from "@/lib/site-url";

const visiblePaths = ["/", ...AI_DISCOVERY_PATHS];
const privatePaths = ["/api/"];

const aiCrawlerUserAgents = [
  "OAI-SearchBot",
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Googlebot",
  "Bingbot",
  "Applebot",
  "Applebot-Extended",
  "CCBot",
  "Amazonbot",
  "Meta-ExternalAgent",
  "FacebookBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: aiCrawlerUserAgents,
        allow: visiblePaths,
        disallow: privatePaths,
      },
      {
        userAgent: "*",
        allow: visiblePaths,
        disallow: privatePaths,
      },
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
