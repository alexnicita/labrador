"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { ExternalLink, LockKeyhole, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  type DemoMessageLimitState,
  type DemoPresenceMember,
  type DemoReactionKind,
} from "@/lib/demo-feed/types";

type CollaborativeSessionRoomProps = {
  initialRows: DemoFeedRow[];
  initialMessageLimit: DemoMessageLimitState;
  realtimeWsUrl: string;
};

type RealtimeEnvelope = {
  type: string;
  seq?: number;
  payload: unknown;
};

const feedMutationEventTypes = new Set([
  "message.created",
  "comment.created",
  "reaction.updated",
  "message.reaction_changed",
  "comment.reaction_changed",
]);

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

function sequenceFromEnvelope(envelope: RealtimeEnvelope) {
  return typeof envelope.seq === "number" && Number.isFinite(envelope.seq)
    ? envelope.seq
    : null;
}

function currentSequenceFromPayload(payload: unknown) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("currentSeq" in payload)
  ) {
    return null;
  }

  const currentSeq = (payload as { currentSeq: unknown }).currentSeq;

  return typeof currentSeq === "number" && Number.isFinite(currentSeq)
    ? currentSeq
    : null;
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
  initialMessageLimit,
  realtimeWsUrl,
}: CollaborativeSessionRoomProps) {
  const [rows, setRows] = useState(initialRows);
  const [messageLimit, setMessageLimit] = useState(initialMessageLimit);
  const [showMessageLimitModal, setShowMessageLimitModal] = useState(false);
  const [dismissedMessageLimitCount, setDismissedMessageLimitCount] = useState<
    number | null
  >(null);
  const [presence, setPresence] = useState<DemoPresenceMember[]>([]);
  const [actor] = useState<DemoActor | null>(() =>
    typeof window === "undefined" ? null : getIdentity(),
  );
  const [selectedMessageId, setSelectedMessageId] = useState(
    initialRows.findLast((row) => row.kind === "message")?.id ?? null,
  );
  const socketRef = useRef<WebSocket | null>(null);
  const lastSeqRef = useRef<number | null>(null);
  const lastPointerSentAtRef = useRef(0);

  const refreshRows = useCallback(async () => {
    const response = await fetch("/api/demo-feed", { cache: "no-store" }).catch(
      () => null,
    );

    if (!response?.ok) {
      return false;
    }

    const payload = (await response.json().catch(() => null)) as {
      rows: DemoFeedRow[];
      messageLimit?: DemoMessageLimitState;
    } | null;

    if (!payload?.rows) {
      return false;
    }

    setRows(payload.rows);

    if (payload.messageLimit) {
      setMessageLimit(payload.messageLimit);
    }

    return true;
  }, []);

  useEffect(() => {
    if (!actor || !realtimeWsUrl) {
      return;
    }

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleReconnect() {
      if (!closed && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          void connect();
        }, 1200);
      }
    }

    async function connect() {
      const tokenResponse = await fetch("/api/realtime-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor }),
      }).catch(() => null);

      if (closed) {
        return;
      }

      if (!tokenResponse?.ok) {
        scheduleReconnect();
        return;
      }

      const tokenPayload = (await tokenResponse.json().catch(() => null)) as {
        token?: string;
      } | null;

      if (!tokenPayload?.token) {
        scheduleReconnect();
        return;
      }

      if (closed) {
        return;
      }

      const { token } = tokenPayload;
      const requestedLastSeq = lastSeqRef.current;
      const socketUrl = new URL(`${realtimeWsUrl.replace(/\/$/, "")}/ws/${DEMO_ROOM_ID}`);
      socketUrl.searchParams.set("token", token);

      if (requestedLastSeq !== null) {
        socketUrl.searchParams.set("lastSeq", String(requestedLastSeq));
      }

      const socket = new WebSocket(socketUrl.toString());
      socketRef.current = socket;

      socket.addEventListener("message", (event) => {
        let envelope: RealtimeEnvelope;

        try {
          envelope = JSON.parse(event.data) as RealtimeEnvelope;
        } catch {
          return;
        }

        const seq = sequenceFromEnvelope(envelope);

        if (envelope.type === "room.joined") {
          if (requestedLastSeq === null) {
            if (seq !== null) {
              lastSeqRef.current = Math.max(lastSeqRef.current ?? 0, seq);
            }

            void refreshRows();
          }

          return;
        }

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

        if (feedMutationEventTypes.has(envelope.type)) {
          setRows((current) =>
            applyMutation(current, envelope.payload as DemoFeedMutationPayload),
          );
        }

        if (envelope.type === "room.resync_required") {
          const currentSeq = currentSequenceFromPayload(envelope.payload);

          void refreshRows().then((refreshed) => {
            if (refreshed && currentSeq !== null) {
              lastSeqRef.current = Math.max(lastSeqRef.current ?? 0, currentSeq);
            }
          });
        }

        if (seq !== null) {
          lastSeqRef.current = Math.max(lastSeqRef.current ?? 0, seq);
        }
      });

      socket.addEventListener("close", () => {
        scheduleReconnect();
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
      }).catch(() => null);

      if (!response) {
        return null;
      }

      const payload = (await response.json().catch(() => null)) as
        | DemoFeedMutationPayload
        | null;

      if (!response.ok) {
        if (payload?.messageLimit?.reached) {
          setMessageLimit(payload.messageLimit);
          setShowMessageLimitModal(true);
        }

        return null;
      }

      if (payload?.messageLimit) {
        setMessageLimit(payload.messageLimit);

        if (payload.messageLimit.reached) {
          setShowMessageLimitModal(true);
        }
      }

      if (!payload) {
        return null;
      }

      setRows((current) => applyMutation(current, payload));
      return payload;
    },
    [actor],
  );

  const visibleMessageCount = useMemo(
    () => rows.filter((row) => row.kind === "message").length,
    [rows],
  );
  const effectiveMessageLimit = useMemo(() => {
    const count = Math.max(messageLimit.count, visibleMessageCount);
    const remaining = Math.max(messageLimit.limit - count, 0);

    return {
      ...messageLimit,
      count,
      remaining,
      reached: messageLimit.reached || count >= messageLimit.limit,
    };
  }, [messageLimit, visibleMessageCount]);
  const shouldShowMessageLimitModal =
    showMessageLimitModal ||
    (effectiveMessageLimit.reached &&
      dismissedMessageLimitCount !== effectiveMessageLimit.count);

  const data = useMemo(
    () => {
      const replica = buildSessionReplicaData({
        rows,
        presence,
        selectedMessageId,
        currentActorId: actor?.id ?? null,
      });

      if (!effectiveMessageLimit.reached) {
        return replica;
      }

      return {
        ...replica,
        currentPermission: {
          ...replica.currentPermission,
          canEditPrompt: false,
          message: `This public room reached ${effectiveMessageLimit.limit.toLocaleString()} saved messages. Reach out on X to collaborate.`,
        },
      };
    },
    [
      actor?.id,
      effectiveMessageLimit.limit,
      effectiveMessageLimit.reached,
      presence,
      rows,
      selectedMessageId,
    ],
  );

  const handleCreateMessage = useCallback(
    async (body: string) => {
      if (effectiveMessageLimit.reached) {
        setShowMessageLimitModal(true);
        return;
      }

      const payload = await mutate({ action: "message", body });
      if (payload?.row?.kind === "message") {
        setSelectedMessageId(payload.row.id);
      }
    },
    [effectiveMessageLimit.reached, mutate],
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
      {shouldShowMessageLimitModal ? (
        <MessageLimitModal
          messageLimit={effectiveMessageLimit}
          onClose={() => {
            setShowMessageLimitModal(false);
            setDismissedMessageLimitCount(effectiveMessageLimit.count);
          }}
        />
      ) : null}
    </div>
  );
}

function MessageLimitModal({
  messageLimit,
  onClose,
}: {
  messageLimit: DemoMessageLimitState;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111318]/55 px-4 py-6 backdrop-blur-sm">
      <section
        aria-labelledby="demo-message-limit-title"
        aria-modal="true"
        className="relative w-full max-w-[660px] rounded-[24px] bg-white p-6 text-[#111318] shadow-[0_28px_90px_rgba(10,18,30,0.28)] sm:p-8"
        role="dialog"
      >
        <Button
          aria-label="Close message limit modal"
          className="absolute right-4 top-4 rounded-full text-[#6d7788]"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>

        <div className="flex size-14 items-center justify-center rounded-[18px] bg-[#111318] text-white">
          <LockKeyhole className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-5 text-[12px] font-bold uppercase text-[#697386]">
          {messageLimit.limit.toLocaleString()} saved messages reached
        </p>
        <h2
          className="mt-3 max-w-[560px] text-[34px] font-bold leading-[1.04] tracking-normal text-[#101318] sm:text-[44px]"
          id="demo-message-limit-title"
        >
          This public demo is capped.
        </h2>
        <p className="mt-4 max-w-[560px] text-[16px] leading-7 text-[#4d5968] sm:text-[18px]">
          The room will stay readable, but new prompts will not be sent to Labrador AI.
          Reach out to Nicita Alex if you are interested in collaborating.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            className="h-12 rounded-[14px] bg-[#111318] px-5 text-[15px] font-semibold text-white hover:bg-[#242936]"
          >
            <a
              href={messageLimit.collaborationUrl}
              rel="noreferrer"
              target="_blank"
            >
              Reach out on X
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </Button>
          <Button
            className="h-12 rounded-[14px] px-5 text-[15px] font-semibold"
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Keep browsing
          </Button>
        </div>
      </section>
    </div>
  );
}
