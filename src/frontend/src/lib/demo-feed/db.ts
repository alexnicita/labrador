import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

import { normalizeDemoActor } from "@/lib/demo-feed/identity";
import {
  DEMO_REACTION_KINDS,
  DEMO_ROOM_ID,
  type DemoActor,
  type DemoFeedKind,
  type DemoFeedRow,
  type DemoReactionKind,
} from "@/lib/demo-feed/types";

type DemoFeedDbRow = {
  id: string;
  room_id: string;
  kind: DemoFeedKind;
  target_id: string | null;
  actor_id: string;
  actor_name: string;
  actor_initials: string;
  actor_color: string;
  body: string | null;
  reaction_kind: DemoReactionKind | null;
  created_at: Date | string;
};

type ToggleReactionResult =
  | { row: DemoFeedRow; removedId: null }
  | { row: null; removedId: string };

const reactionKinds = new Set<string>(DEMO_REACTION_KINDS);

let sqlClient: ReturnType<typeof neon> | null = null;
let tableReady = false;

function getSql() {
  if (!sqlClient) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured");
    }

    sqlClient = neon(databaseUrl);
  }

  return sqlClient;
}

function normalizeActor(actor: Partial<DemoActor> | null | undefined): DemoActor {
  return normalizeDemoActor(actor);
}

function normalizeText(value: unknown, fallback: string, maxLength: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, maxLength);
}

function normalizeToken(value: unknown, fallback: string) {
  const token = typeof value === "string" ? value.trim() : "";
  return (token || fallback).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96) || fallback;
}

function mapRow(row: DemoFeedDbRow): DemoFeedRow {
  return {
    id: row.id,
    roomId: row.room_id,
    kind: row.kind,
    targetId: row.target_id,
    actor: {
      id: row.actor_id,
      name: row.actor_name,
      initials: row.actor_initials,
      color: row.actor_color,
    },
    body: row.body,
    reactionKind: row.reaction_kind,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function ensureDemoFeedTable() {
  if (tableReady) {
    return;
  }

  const sql = getSql();

  await sql`
    create table if not exists labrador_demo_feed (
      id text primary key,
      room_id text not null,
      kind text not null check (kind in ('message', 'comment', 'reaction')),
      target_id text,
      actor_id text not null,
      actor_name text not null,
      actor_initials text not null,
      actor_color text not null,
      body text,
      reaction_kind text check (
        reaction_kind is null
        or reaction_kind in ('thumbs_up', 'smile', 'sparkles', 'eyes')
      ),
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      deleted_at timestamptz,
      check (
        (
          kind in ('message', 'comment')
          and body is not null
          and reaction_kind is null
        )
        or (
          kind = 'reaction'
          and target_id is not null
          and body is null
          and reaction_kind is not null
        )
      )
    )
  `;
  await sql`
    create index if not exists labrador_demo_feed_room_created_idx
      on labrador_demo_feed (room_id, created_at, id)
      where deleted_at is null
  `;
  await sql`
    create index if not exists labrador_demo_feed_target_created_idx
      on labrador_demo_feed (room_id, target_id, created_at)
      where deleted_at is null
  `;
  await sql`
    create unique index if not exists labrador_demo_feed_unique_active_reaction_idx
      on labrador_demo_feed (room_id, target_id, actor_id, reaction_kind)
      where kind = 'reaction' and deleted_at is null
  `;

  tableReady = true;
}

export async function listDemoFeedRows(roomId = DEMO_ROOM_ID) {
  await ensureDemoFeedTable();
  await seedDemoFeed(roomId);

  const sql = getSql();
  const rows = (await sql`
    select
      id,
      room_id,
      kind,
      target_id,
      actor_id,
      actor_name,
      actor_initials,
      actor_color,
      body,
      reaction_kind,
      created_at
    from labrador_demo_feed
    where room_id = ${roomId}
      and deleted_at is null
    order by created_at asc, id asc
  `) as DemoFeedDbRow[];

  return rows.map(mapRow);
}

export async function createDemoMessage({
  roomId = DEMO_ROOM_ID,
  actor,
  body,
}: {
  roomId?: string;
  actor: Partial<DemoActor>;
  body: string;
}) {
  await ensureDemoFeedTable();

  const safeActor = normalizeActor(actor);
  const safeBody = normalizeText(body, "", 4000);

  if (!safeBody) {
    throw new Error("message body is required");
  }

  const sql = getSql();
  const [row] = (await sql`
    insert into labrador_demo_feed (
      id,
      room_id,
      kind,
      actor_id,
      actor_name,
      actor_initials,
      actor_color,
      body
    )
    values (
      ${randomUUID()},
      ${roomId},
      'message',
      ${safeActor.id},
      ${safeActor.name},
      ${safeActor.initials},
      ${safeActor.color},
      ${safeBody}
    )
    returning
      id,
      room_id,
      kind,
      target_id,
      actor_id,
      actor_name,
      actor_initials,
      actor_color,
      body,
      reaction_kind,
      created_at
  `) as DemoFeedDbRow[];

  return mapRow(row);
}

export async function createDemoAiMessage({
  roomId = DEMO_ROOM_ID,
  body,
  requestMessageId,
  model,
}: {
  roomId?: string;
  body: string;
  requestMessageId?: string;
  model?: string;
}) {
  await ensureDemoFeedTable();

  const safeBody = normalizeText(body, "", 6000);

  if (!safeBody) {
    throw new Error("AI message body is required");
  }

  const sql = getSql();
  const metadata = JSON.stringify({
    requestMessageId: requestMessageId ?? null,
    model: model ?? null,
  });
  const [row] = (await sql`
    insert into labrador_demo_feed (
      id,
      room_id,
      kind,
      actor_id,
      actor_name,
      actor_initials,
      actor_color,
      body,
      metadata
    )
    values (
      ${randomUUID()},
      ${roomId},
      'message',
      'ai',
      'Labrador AI',
      'AI',
      'gray',
      ${safeBody},
      ${metadata}::jsonb
    )
    returning
      id,
      room_id,
      kind,
      target_id,
      actor_id,
      actor_name,
      actor_initials,
      actor_color,
      body,
      reaction_kind,
      created_at
  `) as DemoFeedDbRow[];

  return mapRow(row);
}

export async function createDemoComment({
  roomId = DEMO_ROOM_ID,
  actor,
  targetId,
  body,
}: {
  roomId?: string;
  actor: Partial<DemoActor>;
  targetId: string;
  body: string;
}) {
  await ensureDemoFeedTable();

  const safeTargetId = normalizeToken(targetId, "");
  const safeActor = normalizeActor(actor);
  const safeBody = normalizeText(body, "", 2000);

  if (!safeTargetId || !safeBody) {
    throw new Error("comment target and body are required");
  }

  await assertTargetExists(roomId, safeTargetId, ["message"]);

  const sql = getSql();
  const [row] = (await sql`
    insert into labrador_demo_feed (
      id,
      room_id,
      kind,
      target_id,
      actor_id,
      actor_name,
      actor_initials,
      actor_color,
      body
    )
    values (
      ${randomUUID()},
      ${roomId},
      'comment',
      ${safeTargetId},
      ${safeActor.id},
      ${safeActor.name},
      ${safeActor.initials},
      ${safeActor.color},
      ${safeBody}
    )
    returning
      id,
      room_id,
      kind,
      target_id,
      actor_id,
      actor_name,
      actor_initials,
      actor_color,
      body,
      reaction_kind,
      created_at
  `) as DemoFeedDbRow[];

  return mapRow(row);
}

export async function toggleDemoReaction({
  roomId = DEMO_ROOM_ID,
  actor,
  targetId,
  reactionKind,
}: {
  roomId?: string;
  actor: Partial<DemoActor>;
  targetId: string;
  reactionKind: string;
}): Promise<ToggleReactionResult> {
  await ensureDemoFeedTable();

  const safeTargetId = normalizeToken(targetId, "");
  const safeReactionKind = reactionKinds.has(reactionKind)
    ? (reactionKind as DemoReactionKind)
    : null;

  if (!safeTargetId || !safeReactionKind) {
    throw new Error("reaction target and kind are required");
  }

  await assertTargetExists(roomId, safeTargetId, ["message", "comment"]);

  const safeActor = normalizeActor(actor);
  const sql = getSql();
  const [existing] = (await sql`
    select id
    from labrador_demo_feed
    where room_id = ${roomId}
      and kind = 'reaction'
      and target_id = ${safeTargetId}
      and actor_id = ${safeActor.id}
      and reaction_kind = ${safeReactionKind}
      and deleted_at is null
    limit 1
  `) as { id: string }[];

  if (existing) {
    await sql`
      update labrador_demo_feed
      set deleted_at = now()
      where id = ${existing.id}
    `;

    return { row: null, removedId: existing.id };
  }

  const [row] = (await sql`
    insert into labrador_demo_feed (
      id,
      room_id,
      kind,
      target_id,
      actor_id,
      actor_name,
      actor_initials,
      actor_color,
      reaction_kind
    )
    values (
      ${randomUUID()},
      ${roomId},
      'reaction',
      ${safeTargetId},
      ${safeActor.id},
      ${safeActor.name},
      ${safeActor.initials},
      ${safeActor.color},
      ${safeReactionKind}
    )
    returning
      id,
      room_id,
      kind,
      target_id,
      actor_id,
      actor_name,
      actor_initials,
      actor_color,
      body,
      reaction_kind,
      created_at
  `) as DemoFeedDbRow[];

  return { row: mapRow(row), removedId: null };
}

async function assertTargetExists(
  roomId: string,
  targetId: string,
  allowedKinds: DemoFeedKind[],
) {
  const sql = getSql();
  const rows = (await sql`
    select id, kind
    from labrador_demo_feed
    where room_id = ${roomId}
      and id = ${targetId}
      and deleted_at is null
    limit 1
  `) as { id: string; kind: DemoFeedKind }[];

  if (!rows[0] || !allowedKinds.includes(rows[0].kind)) {
    throw new Error("target row was not found");
  }
}

async function seedDemoFeed(roomId: string) {
  const sql = getSql();
  const now = Date.now();
  const scout = normalizeActor({ id: "dog_demo_a1b2", color: "purple" });
  const clover = normalizeActor({ id: "dog_demo_c3d4", color: "green" });
  const zippy = normalizeActor({ id: "dog_demo_e5f6", color: "blue" });
  const terrier = normalizeActor({ id: "dog_demo_g7h8", color: "amber" });
  const corgi = normalizeActor({ id: "dog_demo_j9k0", color: "rose" });
  const ai = normalizeActor({ id: "ai" });
  const labrador = normalizeActor({ id: "labrador" });
  const seedRows = [
    {
      id: "msg-welcome",
      kind: "message",
      targetId: null,
      actor: labrador,
      body:
        "Drop the first shared prompt here. Everyone at the hackathon can comment on posts, react, and build the direction together.",
      reactionKind: null,
      createdAt: new Date(now - 12 * 60_000).toISOString(),
    },
    {
      id: "seed-prompt-room-map",
      kind: "message",
      targetId: null,
      actor: scout,
      body:
        "Can we map the public demo so first-time visitors know exactly what to try together?",
      reactionKind: null,
      createdAt: new Date(now - 10 * 60_000).toISOString(),
    },
    {
      id: "seed-ai-room-map",
      kind: "message",
      targetId: null,
      actor: ai,
      body: [
        "## Try Labrador in 90 seconds",
        "",
        "| Move | What to try | What everyone sees |",
        "| --- | --- | --- |",
        "| Join | Open `trylabrador.com` in another tab or phone | A new dog-name collaborator appears in presence |",
        "| Prompt | Ask for a plan, comparison, or table | The prompt and AI reply save into the shared room |",
        "| React | Tap sparkles, eyes, smile, or thumbs up | Counts update for everyone in realtime |",
        "| Comment | Leave a side note on an AI answer | The right sidebar becomes the team discussion layer |",
        "| Move | Drag your cursor around the room | Other participants see your named live cursor |",
      ].join("\n"),
      reactionKind: null,
      createdAt: new Date(now - 9 * 60_000).toISOString(),
    },
    {
      id: "seed-prompt-build-plan",
      kind: "message",
      targetId: null,
      actor: clover,
      body:
        "Turn the hackathon ideas into a ranked build plan with risks, owners, and next actions.",
      reactionKind: null,
      createdAt: new Date(now - 7 * 60_000).toISOString(),
    },
    {
      id: "seed-ai-build-plan",
      kind: "message",
      targetId: null,
      actor: ai,
      body: [
        "## Ranked build plan",
        "",
        "| Rank | Workstream | Why it matters | Risk | Next action |",
        "| ---: | --- | --- | --- | --- |",
        "| 1 | Realtime room confidence | Makes the demo feel multiplayer immediately | Cursor noise if people pile in | Keep named cursors visible and throttle updates |",
        "| 2 | Team insight prompts | Gives the crowd useful artifacts, not chat noise | Answers get too long | Ask AI for compact tables and decision logs |",
        "| 3 | Comments and reactions | Lets spectators steer the shared work | Feedback can scatter | Anchor comments to the selected message |",
        "| 4 | Saved public memory | Lets late joiners understand the room | Old test data can distract | Seed only polished examples and scroll to latest |",
        "",
        "**Next group prompt:** `What should we decide together in the next 5 minutes?`",
      ].join("\n"),
      reactionKind: null,
      createdAt: new Date(now - 6 * 60_000).toISOString(),
    },
    {
      id: "seed-comment-table",
      kind: "comment",
      targetId: "seed-ai-build-plan",
      actor: zippy,
      body:
        "The **ranked table** is the right format when the room gets noisy. People can react without reading a wall of text.",
      reactionKind: null,
      createdAt: new Date(now - 5 * 60_000).toISOString(),
    },
    {
      id: "seed-comment-reaction-pass",
      kind: "comment",
      targetId: "seed-ai-build-plan",
      actor: terrier,
      body:
        "Let's do a reaction pass after each AI answer: sparkles for useful, eyes for needs review, thumbs up for ship it.",
      reactionKind: null,
      createdAt: new Date(now - 4 * 60_000).toISOString(),
    },
    {
      id: "seed-reaction-room-map-sparkles",
      kind: "reaction",
      targetId: "seed-ai-room-map",
      actor: zippy,
      body: null,
      reactionKind: "sparkles",
      createdAt: new Date(now - 3 * 60_000).toISOString(),
    },
    {
      id: "seed-reaction-plan-thumbs",
      kind: "reaction",
      targetId: "seed-ai-build-plan",
      actor: corgi,
      body: null,
      reactionKind: "thumbs_up",
      createdAt: new Date(now - 2 * 60_000).toISOString(),
    },
    {
      id: "seed-reaction-plan-eyes",
      kind: "reaction",
      targetId: "seed-ai-build-plan",
      actor: scout,
      body: null,
      reactionKind: "eyes",
      createdAt: new Date(now - 90_000).toISOString(),
    },
    {
      id: "seed-reaction-comment-thumbs",
      kind: "reaction",
      targetId: "seed-comment-table",
      actor: clover,
      body: null,
      reactionKind: "thumbs_up",
      createdAt: new Date(now - 60_000).toISOString(),
    },
  ] as const;

  for (const row of seedRows) {
    await sql`
      insert into labrador_demo_feed (
        id,
        room_id,
        kind,
        target_id,
        actor_id,
        actor_name,
        actor_initials,
        actor_color,
        body,
        reaction_kind,
        created_at
      )
      values (
        ${row.id},
        ${roomId},
        ${row.kind},
        ${row.targetId},
        ${row.actor.id},
        ${row.actor.name},
        ${row.actor.initials},
        ${row.actor.color},
        ${row.body},
        ${row.reactionKind},
        ${row.createdAt}
      )
      on conflict (id) do update set
        room_id = excluded.room_id,
        kind = excluded.kind,
        target_id = excluded.target_id,
        actor_id = excluded.actor_id,
        actor_name = excluded.actor_name,
        actor_initials = excluded.actor_initials,
        actor_color = excluded.actor_color,
        body = excluded.body,
        reaction_kind = excluded.reaction_kind,
        deleted_at = null
    `;
  }
}
