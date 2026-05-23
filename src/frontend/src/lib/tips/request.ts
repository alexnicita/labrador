export function getRequestActorKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedHost = forwardedFor?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.slice(0, 80) || "unknown";

  return `tip:${forwardedHost || realIp || "unknown"}:${userAgent}`;
}

export async function readJsonBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}
