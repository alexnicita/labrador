import { sessionReplicaData } from "@/lib/session/mock-data";
import {
  hashText,
  normalizeDemoActor,
} from "@/lib/demo-feed/identity";
import type {
  ActivityItem,
  Actor,
  CollaboratorCursor,
  Comment,
  CommentReaction,
  HumanMessage,
  PresenceActor,
  SessionReplicaData,
} from "@/lib/session/types";
import type {
  DemoFeedRow,
  DemoPresenceMember,
  DemoReactionKind,
} from "@/lib/demo-feed/types";

const actorPalette: Record<string, string> = {
  green: "bg-[#b9dfca] text-[#113527]",
  purple: "bg-[#dcc8ff] text-[#301257]",
  amber: "bg-[#ffd9a6] text-[#573007]",
  blue: "bg-[#bcd8ff] text-[#0b2b52]",
  rose: "bg-[#ffd1dc] text-[#591225]",
  gray: "bg-[#f3f5f8] text-[#56606f]",
};

const reactionOrder: DemoReactionKind[] = [
  "thumbs_up",
  "smile",
  "sparkles",
  "eyes",
];
const cursorColors = [
  "#2589ef",
  "#19a76f",
  "#7c3aed",
  "#f59f00",
  "#e84d76",
  "#0f766e",
];

type CursorFocus = {
  type?: string;
  x?: unknown;
  y?: unknown;
};

function actorClassName(color: string) {
  return actorPalette[color] ?? actorPalette.gray;
}

function actorFromRow(row: DemoFeedRow): Actor {
  if (row.actor.id === "ai") {
    return {
      id: row.actor.id,
      name: row.actor.name,
      initials: row.actor.initials,
      role: "ai",
      roleLabel: "AI",
      avatarClassName: "bg-white text-[#14171a]",
    };
  }

  const actor =
    row.actor.id === "labrador" ? row.actor : normalizeDemoActor(row.actor);

  return {
    id: actor.id,
    name: actor.name,
    initials: actor.initials,
    role: "editor",
    roleLabel: "Hackathon guest",
    avatarClassName: actorClassName(actor.color),
  };
}

function actorFromPresence(member: DemoPresenceMember): Actor {
  const safeActor = normalizeDemoActor({
    id: member.actorId,
    name: member.displayName ?? undefined,
  });

  return {
    id: safeActor.id,
    name: safeActor.name,
    initials: safeActor.initials,
    role: "editor",
    roleLabel: "Live participant",
    avatarClassName: actorClassName(safeActor.color),
  };
}

function uniqueActors(rows: DemoFeedRow[], presence: DemoPresenceMember[]) {
  const actors = new Map<string, Actor>();

  for (const actor of sessionReplicaData.actors) {
    if (actor.id === "ai") {
      actors.set(actor.id, actor);
    }
  }

  for (const row of rows) {
    actors.set(row.actor.id, actorFromRow(row));
  }

  for (const member of presence) {
    if (!member.anonymous) {
      actors.set(member.actorId, actorFromPresence(member));
    }
  }

  return Array.from(actors.values());
}

function reactionCounts(rows: DemoFeedRow[], targetId: string): CommentReaction[] {
  const counts = new Map<DemoReactionKind, number>();

  for (const row of rows) {
    if (row.kind !== "reaction" || row.targetId !== targetId || !row.reactionKind) {
      continue;
    }
    counts.set(row.reactionKind, (counts.get(row.reactionKind) ?? 0) + 1);
  }

  return reactionOrder
    .map((kind) => ({
      id: `${targetId}-${kind}`,
      kind,
      count: counts.get(kind) ?? 0,
    }))
    .filter((reaction) => reaction.count > 0);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(date);
}

function buildMessages(rows: DemoFeedRow[], selectedMessageId: string | null): HumanMessage[] {
  const comments = rows.filter((row) => row.kind === "comment");

  return rows
    .filter((row) => row.kind === "message")
    .map((row) => ({
      id: row.id,
      actorId: row.actor.id,
      time: formatTime(row.createdAt),
      body: row.body ?? "",
      reactions: reactionCounts(rows, row.id),
      commentCount: comments.filter((comment) => comment.targetId === row.id).length,
      selected: row.id === selectedMessageId,
    }));
}

function buildComments(rows: DemoFeedRow[], selectedMessageId: string | null): Comment[] {
  return rows
    .filter((row) => row.kind === "comment")
    .filter((row) => !selectedMessageId || row.targetId === selectedMessageId)
    .map((row) => ({
      id: row.id,
      actorId: row.actor.id,
      targetId: row.targetId,
      time: formatTime(row.createdAt),
      body: row.body ?? "",
      reactions: reactionCounts(rows, row.id),
    }));
}

function buildCommenters(rows: DemoFeedRow[]): Actor[] {
  const commenters = new Map<string, Actor>();

  for (const row of rows) {
    if (row.kind === "comment" && !commenters.has(row.actor.id)) {
      commenters.set(row.actor.id, actorFromRow(row));
    }
  }

  return Array.from(commenters.values());
}

function buildActivity(rows: DemoFeedRow[]): ActivityItem[] {
  return [...rows]
    .filter((row) => row.kind !== "reaction")
    .slice(-6)
    .reverse()
    .map((row) => ({
      id: `activity-${row.id}`,
      actorId: row.actor.id,
      time: formatTime(row.createdAt),
      label:
        row.kind === "message"
          ? "Added a prompt to the shared room."
          : "Commented in the side thread.",
    }));
}

function buildPresence(actors: Actor[], presence: DemoPresenceMember[]): PresenceActor[] {
  if (presence.length === 0) {
    return actors
      .filter((actor) => actor.id !== "ai")
      .slice(0, 4)
      .map((actor) => ({ ...actor, active: true }));
  }

  return presence
    .filter((member) => !member.anonymous)
    .map((member) => {
      const actor =
        actors.find((candidate) => candidate.id === member.actorId) ??
        actorFromPresence(member);

      return { ...actor, active: true };
    });
}

function parseCursorFocus(focus: string | null): { x: number; y: number } | null {
  if (!focus) {
    return null;
  }

  try {
    const parsed = JSON.parse(focus) as CursorFocus;

    if (
      parsed.type !== "cursor" ||
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      !Number.isFinite(parsed.x) ||
      !Number.isFinite(parsed.y)
    ) {
      return null;
    }

    return {
      x: Math.max(8, Math.min(parsed.x, 10000)),
      y: Math.max(8, Math.min(parsed.y, 10000)),
    };
  } catch {
    return null;
  }
}

function buildCursors({
  actors,
  currentActorId,
  presence,
}: {
  actors: Actor[];
  currentActorId: string | null;
  presence: DemoPresenceMember[];
}): CollaboratorCursor[] {
  return presence
    .filter((member) => !member.anonymous && member.actorId !== currentActorId)
    .map((member) => {
      const cursor = parseCursorFocus(member.focus);

      if (!cursor) {
        return null;
      }

      const actor =
        actors.find((candidate) => candidate.id === member.actorId) ??
        actorFromPresence(member);

      return {
        id: `cursor-${member.connectionId}`,
        actorId: member.actorId,
        label: actor.name,
        color: cursorColors[hashText(member.actorId) % cursorColors.length],
        top: `${cursor.y}px`,
        left: `${cursor.x}px`,
      };
    })
    .filter((cursor): cursor is CollaboratorCursor => Boolean(cursor));
}

export function buildSessionReplicaData({
  currentActorId,
  rows,
  presence,
  selectedMessageId,
}: {
  currentActorId?: string | null;
  rows: DemoFeedRow[];
  presence: DemoPresenceMember[];
  selectedMessageId: string | null;
}): SessionReplicaData {
  const actors = uniqueActors(rows, presence);
  const messages = buildMessages(rows, selectedMessageId);
  const comments = buildComments(rows, selectedMessageId);
  const commenters = buildCommenters(rows);
  const activePresence = buildPresence(actors, presence);
  const selectedMessage =
    messages.find((message) => message.id === selectedMessageId) ?? messages.at(-1);

  return {
    ...sessionReplicaData,
    session: {
      title: "Hackathon Prompt Room",
      subtitle: "Public collaborative demo",
      liveCount: Math.max(activePresence.length, 1),
      viewerCount: Math.max(activePresence.length, 1),
      anonymousViewerCount: 0,
    },
    currentPermission: {
      canComment: true,
      canEditPrompt: true,
      canCreateBranches: false,
      message: "Everyone in this public demo can prompt, comment, and react.",
    },
    actors,
    commenters,
    presence: activePresence,
    messages,
    selectedMessageId: selectedMessage?.id ?? null,
    selectedMessage,
    cursors: buildCursors({
      actors,
      currentActorId: currentActorId ?? null,
      presence,
    }),
    comments,
    activity: buildActivity(rows),
    run: {
      status: "running",
      label: "Live collaboration room",
      steps: [
        { id: "join", label: "Participants joining", status: "active" },
        { id: "prompt", label: "Prompts syncing", status: "active" },
        { id: "comments", label: "Side comments active", status: "active" },
      ],
    },
  };
}
