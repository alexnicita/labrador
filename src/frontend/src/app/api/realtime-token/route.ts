import { NextRequest } from "next/server";

import { normalizeDemoActor } from "@/lib/demo-feed/identity";
import { checkDemoRateLimit } from "@/lib/demo-feed/rate-limit";
import { signDemoRealtimeToken } from "@/lib/demo-feed/realtime";
import type { DemoActor } from "@/lib/demo-feed/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let actor: DemoActor;

  try {
    const payload = (await request.json()) as { actor: DemoActor };
    actor = payload.actor;
  } catch {
    return Response.json({ code: "payload_invalid" }, { status: 400 });
  }

  const safeActor = normalizeDemoActor(actor);

  if (!safeActor.id || !(await checkDemoRateLimit(safeActor.id, "token"))) {
    return Response.json({ code: "rate_limited" }, { status: 429 });
  }

  return Response.json({
    token: signDemoRealtimeToken(safeActor),
  });
}
