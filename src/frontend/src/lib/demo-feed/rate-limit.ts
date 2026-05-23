type RateLimitAction =
  | "message"
  | "comment"
  | "reaction"
  | "token"
  | "ai"
  | "search"
  | "analytics"
  | "tip";

const actionLimits: Record<RateLimitAction, number> = {
  message: 12,
  comment: 18,
  reaction: 60,
  token: 30,
  ai: 3,
  search: 5,
  analytics: 8,
  tip: 8,
};

export async function checkDemoRateLimit(actorId: string, action: RateLimitAction) {
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return true;
  }

  const bucket = Math.floor(Date.now() / 10_000);
  const key = encodeURIComponent(`demo:${action}:${actorId}:${bucket}`);
  const headers = { Authorization: `Bearer ${redisToken}` };
  const increment = await fetch(`${redisUrl}/incr/${key}`, {
    method: "POST",
    headers,
    cache: "no-store",
  });

  if (!increment.ok) {
    return true;
  }

  const payload = (await increment.json()) as { result?: number };
  const count = Number(payload.result ?? 1);

  if (count === 1) {
    await fetch(`${redisUrl}/expire/${key}/10`, {
      method: "POST",
      headers,
      cache: "no-store",
    });
  }

  return count <= actionLimits[action];
}
