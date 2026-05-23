"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";

import { SessionShell } from "@/components/session/session-shell";
import {
  colorForId,
  dogNameForId,
  initialsForName,
  normalizeDemoActor,
} from "@/lib/demo-feed/identity";
import { buildSessionReplicaData } from "@/lib/demo-feed/state";
import {
  DEMO_ROOM_ID,
  type DemoActor,
  type DemoFeedMutationPayload,
  type DemoFeedRow,
  type DemoPresenceMember,
  type DemoReactionKind,
} from "@/lib/demo-feed/types";

type CollaborativeSessionRoomProps = {
  initialRows: DemoFeedRow[];
  realtimeWsUrl: string;
};

type RealtimeEnvelope = {
  type: string;
  payload: unknown;
};

function createGuestIdentity(): DemoActor {
  const id = `dog_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const name = dogNameForId(id);

  return {
    id,
    name,
    initials: initialsForName(name),
    color: colorForId(id),
  };
}

function getIdentity() {
  const key = "labrador-demo-actor";
  const existing = window.localStorage.getItem(key);

  if (existing) {
    try {
      const parsedActor = JSON.parse(existing) as DemoActor;

      if (parsedActor.id) {
        const actor = normalizeDemoActor(parsedActor);
        window.localStorage.setItem(key, JSON.stringify(actor));
        return actor;
      }
    } catch {
      window.localStorage.removeItem(key);
    }
  }

  const actor = createGuestIdentity();
  window.localStorage.setItem(key, JSON.stringify(actor));
  return actor;
}

function applyMutation(
  rows: DemoFeedRow[],
  payload: DemoFeedMutationPayload,
): DemoFeedRow[] {
  if (payload.removedId) {
    return rows.filter((row) => row.id !== payload.removedId);
  }

  if (payload.rows?.length) {
    return payload.rows.reduce(
      (current, row) => applyMutation(current, { row }),
      rows,
    );
  }

  if (!payload.row) {
    return rows;
  }

  const existingIndex = rows.findIndex((row) => row.id === payload.row?.id);

  if (existingIndex === -1) {
    return [...rows, payload.row];
  }

  return rows.map((row, index) => (index === existingIndex ? payload.row! : row));
}

function presenceFromPayload(payload: unknown): DemoPresenceMember[] {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "visible" in payload &&
    Array.isArray((payload as { visible: unknown }).visible)
  ) {
    return (payload as { visible: DemoPresenceMember[] }).visible;
  }

  return [];
}

function presenceUpdateFromPayload(
  payload: unknown,
): (Partial<DemoPresenceMember> & { connectionId: string; present?: boolean }) | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const update = payload as Partial<DemoPresenceMember> & { present?: boolean };

  const connectionId = update.connectionId;

  if (!connectionId) {
    return null;
  }

  return { ...update, connectionId };
}

export function CollaborativeSessionRoom({
  initialRows,
  realtimeWsUrl,
}: CollaborativeSessionRoomProps) {
  const [rows, setRows] = useState(initialRows);
  const [presence, setPresence] = useState<DemoPresenceMember[]>([]);
  const [actor] = useState<DemoActor | null>(() =>
    typeof window === "undefined" ? null : getIdentity(),
  );
  const [selectedMessageId, setSelectedMessageId] = useState(
    initialRows.findLast((row) => row.kind === "message")?.id ?? null,
  );
  const socketRef = useRef<WebSocket | null>(null);
  const lastPointerSentAtRef = useRef(0);

  const refreshRows = useCallback(async () => {
    const response = await fetch("/api/demo-feed", { cache: "no-store" });

    if (response.ok) {
      const payload = (await response.json()) as { rows: DemoFeedRow[] };
      setRows(payload.rows);
    }
  }, []);

  useEffect(() => {
    if (!actor || !realtimeWsUrl) {
      return;
    }

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      const tokenResponse = await fetch("/api/realtime-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor }),
      });

      if (!tokenResponse.ok || closed) {
        return;
      }

      const { token } = (await tokenResponse.json()) as { token: string };
      const socket = new WebSocket(
        `${realtimeWsUrl.replace(/\/$/, "")}/ws/${DEMO_ROOM_ID}?token=${encodeURIComponent(token)}`,
      );
      socketRef.current = socket;

      socket.addEventListener("message", (event) => {
        const envelope = JSON.parse(event.data) as RealtimeEnvelope;

        if (envelope.type === "presence.snapshot") {
          setPresence(presenceFromPayload(envelope.payload));
          return;
        }

        if (envelope.type === "presence.update") {
          const update = presenceUpdateFromPayload(envelope.payload);

          if (!update) {
            return;
          }

          const connectionId = update.connectionId;

          setPresence((current) => {
            const without = current.filter(
              (member) => member.connectionId !== connectionId,
            );

            if (!update.present || update.anonymous) {
              return without;
            }

            return [
              ...without,
              {
                connectionId,
                actorId: update.actorId ?? connectionId,
                displayName: update.displayName ?? null,
                role: update.role ?? null,
                anonymous: false,
                typing: update.typing ?? false,
                focus: update.focus ?? null,
              },
            ];
          });
          return;
        }

        if (
          envelope.type === "message.created" ||
          envelope.type === "comment.created" ||
          envelope.type === "message.reaction_changed" ||
          envelope.type === "comment.reaction_changed"
        ) {
          setRows((current) =>
            applyMutation(current, envelope.payload as DemoFeedMutationPayload),
          );
        }

        if (envelope.type === "room.resync_required") {
          void refreshRows();
        }
      });

      socket.addEventListener("close", () => {
        if (!closed) {
          reconnectTimer = setTimeout(connect, 1200);
        }
      });
    }

    void connect();

    return () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      socketRef.current?.close();
    };
  }, [actor, realtimeWsUrl, refreshRows]);

  const sendPresencePatch = useCallback((payload: object) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "presence.update",
        eventId: crypto.randomUUID(),
        payload,
      }),
    );
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!actor || event.pointerType === "touch") {
        return;
      }

      const now = performance.now();

      if (now - lastPointerSentAtRef.current < 90) {
        return;
      }

      lastPointerSentAtRef.current = now;
      sendPresencePatch({
        focus: JSON.stringify({
          type: "cursor",
          x: Math.round(event.clientX),
          y: Math.round(event.clientY),
        }),
      });
    },
    [actor, sendPresencePatch],
  );

  const mutate = useCallback(
    async (body: object) => {
      if (!actor) {
        return null;
      }

      const response = await fetch("/api/demo-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, ...body }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as DemoFeedMutationPayload;
      setRows((current) => applyMutation(current, payload));
      return payload;
    },
    [actor],
  );

  const data = useMemo(
    () =>
      buildSessionReplicaData({
        rows,
        presence,
        selectedMessageId,
        currentActorId: actor?.id ?? null,
      }),
    [actor?.id, presence, rows, selectedMessageId],
  );

  const handleCreateMessage = useCallback(
    async (body: string) => {
      const payload = await mutate({ action: "message", body });
      if (payload?.row?.kind === "message") {
        setSelectedMessageId(payload.row.id);
      }
    },
    [mutate],
  );

  const handleCreateComment = useCallback(
    async (body: string) => {
      const targetId = data.selectedMessageId;

      if (!targetId) {
        return;
      }

      await mutate({ action: "comment", targetId, body });
    },
    [data.selectedMessageId, mutate],
  );

  const handleReaction = useCallback(
    async (
      targetId: string,
      targetKind: "message" | "comment",
      reactionKind: DemoReactionKind,
    ) => {
      await mutate({
        action: "reaction",
        targetId,
        targetKind,
        reactionKind,
      });
    },
    [mutate],
  );

  return (
    <div className="h-dvh w-screen" onPointerMove={handlePointerMove}>
      <SessionShell
        data={data}
        onCreateMessage={handleCreateMessage}
        onCreateComment={handleCreateComment}
        onSelectMessage={setSelectedMessageId}
        onReact={handleReaction}
      />
    </div>
  );
}
