import { AIDocumentCard } from "@/components/ai/ai-document-card";
import { PermissionComposer } from "@/components/ai/permission-composer";
import { RunStatusDock } from "@/components/ai/run-status-dock";
import { CollaboratorCursor } from "@/components/session/collaborator-cursor";
import { HumanMessage } from "@/components/session/human-message";
import type { Actor, CommentReaction, SessionReplicaData } from "@/lib/session/types";

type SessionMainThreadProps = {
  data: Pick<
    SessionReplicaData,
    | "actors"
    | "currentPermission"
    | "cursors"
    | "document"
    | "kickoffMessage"
    | "messages"
    | "run"
  >;
  onCreateMessage?: (body: string) => void | Promise<void>;
  onSelectMessage?: (messageId: string) => void;
  onReact?: (
    targetId: string,
    targetKind: "message" | "comment",
    reactionKind: CommentReaction["kind"],
  ) => void | Promise<void>;
};

function findActor(actors: Actor[], actorId: string) {
  return actors.find((actor) => actor.id === actorId) ?? actors[0];
}

export function SessionMainThread({
  data,
  onCreateMessage,
  onSelectMessage,
  onReact,
}: SessionMainThreadProps) {
  const messages = data.messages.length > 0 ? data.messages : [data.kickoffMessage];

  return (
    <main className="relative flex h-full min-h-0 flex-col bg-white" aria-label="Session work">
      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="relative mx-auto w-full max-w-[880px] px-4 py-4 pb-5 sm:px-6 lg:py-3">
          <div className="space-y-3">
            {messages.map((message) => (
              <HumanMessage
                actor={findActor(data.actors, message.actorId)}
                key={message.id}
                message={message}
                onComment={
                  onSelectMessage ? () => onSelectMessage(message.id) : undefined
                }
                onReact={
                  onReact
                    ? (reactionKind) => onReact(message.id, "message", reactionKind)
                    : undefined
                }
              />
            ))}
          </div>

          <div className="relative mt-3">
            {data.cursors.map((cursor) => (
              <CollaboratorCursor cursor={cursor} key={cursor.id} />
            ))}
            <div className="overflow-hidden rounded-[16px] border border-[#dfe5eb] bg-white shadow-[0_1px_0_rgba(13,18,28,0.03)]">
              <AIDocumentCard document={data.document} />
              <RunStatusDock run={data.run} />
              <PermissionComposer
                permission={data.currentPermission}
                onSubmit={onCreateMessage}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
