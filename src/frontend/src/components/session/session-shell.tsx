import { CollaborationPanel } from "@/components/session/collaboration-panel";
import { SessionMainThread } from "@/components/session/session-main-thread";
import { SessionSidebar } from "@/components/session/session-sidebar";
import { PresenceCluster } from "@/components/session/presence-cluster";
import { SessionOverflowMenu } from "@/components/session/session-overflow-menu";
import { ShareSessionButton } from "@/components/session/share-session-button";
import { SessionWorkspaceLayout } from "@/components/session/session-workspace-layout";
import { TipLabradorButton } from "@/components/session/tip-labrador-button";
import type { CommentReaction, SessionReplicaData } from "@/lib/session/types";

type SessionShellProps = {
  data: SessionReplicaData;
  onCreateMessage?: (body: string) => void | Promise<void>;
  onCreateComment?: (body: string) => void | Promise<void>;
  onSelectMessage?: (messageId: string) => void;
  onReact?: (
    targetId: string,
    targetKind: "message" | "comment",
    reactionKind: CommentReaction["kind"],
  ) => void | Promise<void>;
};

export function SessionShell({
  data,
  onCreateMessage,
  onCreateComment,
  onSelectMessage,
  onReact,
}: SessionShellProps) {
  const headerParticipants =
    data.commenters.length > 0 ? data.commenters : data.presence;
  const threadCount = data.comments.reduce(
    (count, comment) => count + 1 + (comment.replies?.length ?? 0),
    0,
  );
  const sidebar = (
    <SessionSidebar
      data={{
        branches: data.branches,
        session: data.session,
        versions: data.versions,
      }}
    />
  );
  const rightPanel = (
    <CollaborationPanel
      data={{
        actors: data.actors,
        activity: data.activity,
        comments: data.comments,
        currentPermission: data.currentPermission,
        presence: data.presence,
        selectedMessage: data.selectedMessage,
        session: data.session,
      }}
      className="h-full"
      onCreateComment={onCreateComment}
      onReact={onReact}
    />
  );

  return (
    <SessionWorkspaceLayout
      title={data.session.title}
      subtitle={data.session.subtitle}
      liveCount={data.session.liveCount}
      viewerCount={data.session.viewerCount}
      threadCount={threadCount}
      sidebar={sidebar}
      main={
        <SessionMainThread
          data={{
            actors: data.actors,
            cursors: data.cursors,
            currentPermission: data.currentPermission,
            kickoffMessage: data.kickoffMessage,
            messages: data.messages,
          }}
          onCreateMessage={onCreateMessage}
          onReact={onReact}
          onSelectMessage={onSelectMessage}
        />
      }
      rightPanel={rightPanel}
      presence={
        <PresenceCluster
          ariaLabel={
            data.commenters.length > 0
              ? "People who have commented"
              : "Visible collaborators"
          }
          participants={headerParticipants}
        />
      }
      shareControl={<ShareSessionButton />}
      tipControl={<TipLabradorButton />}
      overflowControl={<SessionOverflowMenu />}
    />
  );
}
