import { PermissionComposer } from "@/components/ai/permission-composer";
import { CollaboratorCursor } from "@/components/session/collaborator-cursor";
import { HumanMessage } from "@/components/session/human-message";
import { ScrollToLatest } from "@/components/session/scroll-to-latest";
import type { Actor, CommentReaction, SessionReplicaData } from "@/lib/session/types";

type SessionMainThreadProps = {
  data: Pick<
    SessionReplicaData,
    | "actors"
    | "currentPermission"
    | "cursors"
    | "kickoffMessage"
    | "messages"
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

const threadContainerId = "labrador-session-thread-scroll";
const latestAnchorId = "labrador-session-thread-latest";

export function SessionMainThread({
  data,
  onCreateMessage,
  onSelectMessage,
  onReact,
}: SessionMainThreadProps) {
  const messages = data.messages.length > 0 ? data.messages : [data.kickoffMessage];
  const latestMessageKey = messages.map((message) => message.id).join(":");

  return (
    <main className="relative flex h-full min-h-0 flex-col bg-white" aria-label="Session work">
      {data.cursors.map((cursor) => (
        <CollaboratorCursor cursor={cursor} key={cursor.id} />
      ))}
      <ScrollToLatest
        anchorId={latestAnchorId}
        containerId={threadContainerId}
        watchKey={latestMessageKey}
      />
      <div
        id={threadContainerId}
        className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto bg-white"
        data-scroll-origin="bottom"
      >
        <div className="relative mx-auto w-full max-w-[880px] shrink-0 px-3 py-4 pb-5 sm:px-6 lg:py-3">
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
            <div className="overflow-hidden rounded-[16px] border border-[#dfe5eb] bg-white shadow-[0_1px_0_rgba(13,18,28,0.03)]">
              <PermissionComposer
                permission={data.currentPermission}
                onSubmit={onCreateMessage}
              />
            </div>
          </div>
          <div id={latestAnchorId} className="h-px" aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
