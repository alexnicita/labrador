import { createHmac } from "node:crypto";

import { DEMO_ROOM_ID, type DemoActor } from "@/lib/demo-feed/types";

type RealtimeEventType =
  | "message.created"
  | "comment.created"
  | "message.reaction_changed"
  | "comment.reaction_changed"
  | "run.started"
  | "run.status";

function base64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function signDemoRealtimeToken(actor: DemoActor) {
  const secret = process.env.REALTIME_AUTH_JWT_SECRET;

  if (!secret) {
    throw new Error("REALTIME_AUTH_JWT_SECRET is not configured");
  }

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: actor.id,
    sessionId: DEMO_ROOM_ID,
    capabilities: ["session.view", "session.edit_prompt"],
    displayName: actor.name,
    role: "editor",
    anonymous: false,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  const body = `${base64Url(header)}.${base64Url(payload)}`;
  const signature = createHmac("sha256", secret).update(body).digest("base64url");

  return `${body}.${signature}`;
}

export async function publishDemoRealtimeEvent({
  eventType,
  actorId,
  payload,
}: {
  eventType: RealtimeEventType;
  actorId: string;
  payload: unknown;
}) {
  const serviceUrl = process.env.REALTIME_SERVICE_URL;
  const secret = process.env.REALTIME_PUBLISH_SECRET ?? process.env.REALTIME_AUTH_JWT_SECRET;

  if (!serviceUrl || !secret) {
    return false;
  }

  try {
    const response = await fetch(
      `${serviceUrl.replace(/\/$/, "")}/rooms/${DEMO_ROOM_ID}/publish`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: eventType,
          actorId,
          payload,
        }),
      },
    );

    if (!response.ok) {
      console.warn("failed to publish realtime demo event", {
        status: response.status,
        eventType,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.warn("failed to publish realtime demo event", {
      code: error instanceof Error ? error.name : "unknown_error",
      eventType,
    });
    return false;
  }
}
