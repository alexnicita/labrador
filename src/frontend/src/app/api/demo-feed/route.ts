import { NextRequest } from "next/server";

import {
  createDemoAiMessage,
  createDemoComment,
  createDemoMessage,
  listDemoFeedRows,
  toggleDemoReaction,
} from "@/lib/demo-feed/db";
import { trackUsageEvent } from "@/lib/demo-feed/clickhouse";
import { generateDemoAiReply } from "@/lib/demo-feed/openai";
import { checkDemoRateLimit } from "@/lib/demo-feed/rate-limit";
import { publishDemoRealtimeEvent } from "@/lib/demo-feed/realtime";
import type { DemoActor, DemoFeedRow } from "@/lib/demo-feed/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DemoFeedRequest =
  | {
      action: "message";
      actor: Partial<DemoActor>;
      body: string;
    }
  | {
      action: "comment";
      actor: Partial<DemoActor>;
      targetId: string;
      body: string;
    }
  | {
      action: "reaction";
      actor: Partial<DemoActor>;
      targetId: string;
      targetKind: "message" | "comment";
      reactionKind: string;
    };

export async function GET() {
  const rows = await listDemoFeedRows();
  return Response.json({ rows });
}

export async function POST(request: NextRequest) {
  let payload: DemoFeedRequest;

  try {
    payload = (await request.json()) as DemoFeedRequest;
  } catch {
    return Response.json({ code: "payload_invalid" }, { status: 400 });
  }

  if (
    payload.action !== "message" &&
    payload.action !== "comment" &&
    payload.action !== "reaction"
  ) {
    return Response.json({ code: "payload_invalid" }, { status: 400 });
  }

  const actorId = payload.actor?.id ?? "guest";

  if (!(await checkDemoRateLimit(actorId, payload.action))) {
    return Response.json({ code: "rate_limited" }, { status: 429 });
  }

  try {
    if (payload.action === "message") {
      const row = await createDemoMessage({
        actor: payload.actor,
        body: payload.body,
      });

      void trackUsageEvent({
        actorId: row.actor.id,
        action: "message.create",
        provider: "app",
        status: "success",
        inputChars: row.body?.length ?? 0,
      });

      const published = await publishDemoRealtimeEvent({
        eventType: "message.created",
        actorId: row.actor.id,
        payload: { row },
      });
      trackRealtimePublish("message.created", row.actor.id, published);

      const aiRows = await createDemoAiReplyRows({
        actorId,
        latestMessage: row,
      });

      if (aiRows.length > 0) {
        return Response.json({ rows: [row, ...aiRows] });
      }

      return Response.json({ row });
    }

    if (payload.action === "comment") {
      const row = await createDemoComment({
        actor: payload.actor,
        targetId: payload.targetId,
        body: payload.body,
      });

      void trackUsageEvent({
        actorId: row.actor.id,
        action: "comment.create",
        provider: "app",
        status: "success",
        inputChars: row.body?.length ?? 0,
      });

      const published = await publishDemoRealtimeEvent({
        eventType: "comment.created",
        actorId: row.actor.id,
        payload: { row },
      });
      trackRealtimePublish("comment.created", row.actor.id, published);

      return Response.json({ row });
    }

    const result = await toggleDemoReaction({
      actor: payload.actor,
      targetId: payload.targetId,
      reactionKind: payload.reactionKind,
    });

    void trackUsageEvent({
      actorId: payload.actor?.id ?? "guest",
      action: "reaction.toggle",
      provider: "app",
      status: "success",
      metadata: {
        targetKind: payload.targetKind,
        reactionKind: payload.reactionKind,
      },
    });

    const eventType =
      payload.targetKind === "message"
        ? "message.reaction_changed"
        : "comment.reaction_changed";
    const published = await publishDemoRealtimeEvent({
      eventType,
      actorId: payload.actor?.id ?? "guest",
      payload: result,
    });
    trackRealtimePublish(eventType, payload.actor?.id ?? "guest", published);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        code: "payload_invalid",
        message: error instanceof Error ? error.message : "request failed",
      },
      { status: 400 },
    );
  }
}

async function createDemoAiReplyRows({
  actorId,
  latestMessage,
}: {
  actorId: string;
  latestMessage: DemoFeedRow;
}) {
  if (!(await checkDemoRateLimit(actorId, "ai"))) {
    void trackUsageEvent({
      actorId,
      action: "ai.reply",
      provider: "openai",
      status: "skipped",
      errorCode: "rate_limited",
    });
    return [];
  }

  try {
    const rows = await listDemoFeedRows();
    const startedPublished = await publishDemoRealtimeEvent({
      eventType: "run.started",
      actorId,
      payload: {
        requestMessageId: latestMessage.id,
        status: "running",
      },
    });
    trackRealtimePublish("run.started", actorId, startedPublished);

    const startedAt = Date.now();
    const result = await generateDemoAiReply({ rows, latestMessage });

    if (result.status === "not_configured") {
      void trackUsageEvent({
        actorId,
        action: "ai.reply",
        provider: "openai",
        status: "skipped",
        errorCode: "not_configured",
      });
      return [];
    }

    void trackUsageEvent({
      actorId,
      runId: result.runId,
      action: "ai.reply",
      provider: "openai",
      status: result.status === "completed" ? "success" : "failed",
      latencyMs: Date.now() - startedAt,
      inputChars: latestMessage.body?.length ?? 0,
      outputChars:
        result.status === "completed" ? result.body.length : result.message.length,
      errorCode: result.status === "completed" ? null : "ai_reply_failed",
      metadata: {
        model: result.model,
        requestMessageId: latestMessage.id,
      },
    });

    const row = await createDemoAiMessage({
      body: result.status === "completed" ? result.body : result.message,
      requestMessageId: latestMessage.id,
      model: result.model,
    });

    const messagePublished = await publishDemoRealtimeEvent({
      eventType: "message.created",
      actorId: row.actor.id,
      payload: { row },
    });
    trackRealtimePublish("message.created", row.actor.id, messagePublished);

    const statusPublished = await publishDemoRealtimeEvent({
      eventType: "run.status",
      actorId: row.actor.id,
      payload: {
        requestMessageId: latestMessage.id,
        runId: result.runId,
        status: result.status,
      },
    });
    trackRealtimePublish("run.status", row.actor.id, statusPublished);

    return [row];
  } catch (error) {
    console.warn("failed to create demo AI reply", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    void trackUsageEvent({
      actorId,
      action: "ai.reply",
      provider: "openai",
      status: "failed",
      errorCode: "ai_reply_exception",
    });
    return [];
  }
}

function trackRealtimePublish(
  eventType: string,
  actorId: string,
  published: boolean,
) {
  void trackUsageEvent({
    actorId,
    action: "realtime.publish",
    provider: "labrador-realtime",
    status: published ? "success" : "skipped",
    metadata: { eventType },
  });
}
