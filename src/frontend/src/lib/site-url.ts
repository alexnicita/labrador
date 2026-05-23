export const DEFAULT_SITE_URL = "https://trylabrador.com";

export const AI_DISCOVERY_PATHS = [
  "/llms.txt",
  "/llms-full.txt",
  "/ai.txt",
  "/aeo.txt",
  "/geo.txt",
  "/humans.txt",
] as const;

export function getSiteUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    DEFAULT_SITE_URL;

  const withProtocol = /^https?:\/\//.test(rawUrl)
    ? rawUrl
    : `https://${rawUrl}`;

  return withProtocol.replace(/\/+$/, "");
}

export function getAbsoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath === "/" ? "" : normalizedPath}`;
}
