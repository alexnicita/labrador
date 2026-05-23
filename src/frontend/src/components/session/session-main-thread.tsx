import { AIDocumentCard } from "@/components/ai/ai-document-card";
import { PermissionComposer } from "@/components/ai/permission-composer";
import { RunStatusDock } from "@/components/ai/run-status-dock";
import { CollaboratorCursor } from "@/components/session/collaborator-cursor";
import { HumanMessage } from "@/components/session/human-message";
import type { Actor, SessionReplicaData } from "@/lib/session/types";

type SessionMainThreadProps = {
  data: Pick<
    SessionReplicaData,
    "actors" | "currentPermission" | "cursors" | "document" | "kickoffMessage" | "run"
  >;
};

function findActor(actors: Actor[], actorId: string) {
  return actors.find((actor) => actor.id === actorId) ?? actors[0];
}

export function SessionMainThread({ data }: SessionMainThreadProps) {
  const kickoffActor = findActor(data.actors, data.kickoffMessage.actorId);

  return (
    <main className="relative min-h-0 overflow-y-auto bg-white">
      <div className="relative mx-auto w-full max-w-[940px] px-4 py-6 pb-8 sm:px-7 lg:py-8">
        <HumanMessage actor={kickoffActor} message={data.kickoffMessage} />

        <div className="relative mt-8">
          {data.cursors.map((cursor) => (
            <CollaboratorCursor cursor={cursor} key={cursor.id} />
          ))}
          <AIDocumentCard document={data.document} />
          <div className="mt-5 overflow-hidden rounded-[16px] border border-[#dfe5eb] bg-white shadow-[0_1px_0_rgba(13,18,28,0.03)]">
            <RunStatusDock run={data.run} />
            <PermissionComposer permission={data.currentPermission} />
          </div>
        </div>
      </div>
    </main>
  );
}
