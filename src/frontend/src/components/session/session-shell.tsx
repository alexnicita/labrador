import { CollaborationPanel } from "@/components/session/collaboration-panel";
import { SessionHeader } from "@/components/session/session-header";
import { SessionMainThread } from "@/components/session/session-main-thread";
import { SessionSidebar } from "@/components/session/session-sidebar";
import type { SessionReplicaData } from "@/lib/session/types";

type SessionShellProps = {
  data: SessionReplicaData;
};

export function SessionShell({ data }: SessionShellProps) {
  return (
    <main className="labrador-app-bg relative min-h-screen overflow-hidden px-3 py-3 text-[#111318] sm:px-6 sm:py-6 lg:px-10 lg:py-11">
      <section className="relative mx-auto flex min-h-[calc(100dvh-24px)] w-full max-w-[1640px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_28px_90px_rgba(31,45,61,0.16)] lg:h-[calc(100vh-88px)] lg:min-h-[760px] lg:rounded-[30px]">
        <SessionSidebar
          data={{
            branches: data.branches,
            session: data.session,
            versions: data.versions,
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <SessionHeader
            data={{ presence: data.presence, session: data.session }}
            mobileCollaborationPanel={
              <CollaborationPanel
                data={{
                  actors: data.actors,
                  activity: data.activity,
                  comments: data.comments,
                  currentPermission: data.currentPermission,
                  presence: data.presence,
                  session: data.session,
                }}
                className="h-full"
              />
            }
          />
          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_386px]">
            <SessionMainThread
              data={{
                actors: data.actors,
                currentPermission: data.currentPermission,
                cursors: data.cursors,
                document: data.document,
                kickoffMessage: data.kickoffMessage,
                run: data.run,
              }}
            />
            <div className="hidden min-h-0 border-l border-[#e0e6ed] bg-[#fbfcfd] p-6 pl-5 lg:block">
              <CollaborationPanel
                data={{
                  actors: data.actors,
                  activity: data.activity,
                  comments: data.comments,
                  currentPermission: data.currentPermission,
                  presence: data.presence,
                  session: data.session,
                }}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
