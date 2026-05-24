import { ChevronDown, X } from "lucide-react";

import { CommentCard } from "@/components/session/comment-card";
import { CommentComposer } from "@/components/session/comment-composer";
import { MarkdownPreview } from "@/components/session/markdown-content";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { Actor, CommentReaction, SessionReplicaData } from "@/lib/session/types";
import { cn } from "@/lib/utils";

type CollaborationPanelProps = {
  data: Pick<
    SessionReplicaData,
    "actors" | "activity" | "comments" | "currentPermission" | "presence" | "session"
  > &
    Pick<SessionReplicaData, "selectedMessage">;
  className?: string;
  onCreateComment?: (body: string) => void | Promise<void>;
  onReact?: (
    targetId: string,
    targetKind: "message" | "comment",
    reactionKind: CommentReaction["kind"],
  ) => void | Promise<void>;
};

function actorFor(actors: Actor[], actorId: string) {
  return actors.find((actor) => actor.id === actorId) ?? actors[0];
}

export function CollaborationPanel({
  data,
  className,
  onCreateComment,
  onReact,
}: CollaborationPanelProps) {
  const pinnedComment = data.comments.find((comment) => comment.pinned);
  const regularComments = data.comments.filter((comment) => !comment.pinned);
  const createCommentHandler = onCreateComment
    ? { onSubmit: onCreateComment }
    : {};

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-[#dfe5eb] bg-white",
        className,
      )}
      aria-label="Session collaboration"
    >
      <Tabs defaultValue="thread" className="min-h-0 flex-1 gap-0">
        <div className="flex h-14 shrink-0 items-center border-b border-[#e4e9ef] px-4">
          <TabsList variant="line" className="h-full flex-1 justify-start gap-6 p-0">
            <TabsTrigger
              value="thread"
              className="h-full flex-none rounded-none px-0 text-[13px] font-semibold"
            >
              Thread
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="h-full flex-none rounded-none px-0 text-[13px] font-semibold"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="participants"
              className="h-full flex-none rounded-none px-0 text-[13px] font-semibold"
            >
              Participants ({data.session.liveCount})
            </TabsTrigger>
          </TabsList>
          <span className="grid size-8 place-items-center rounded-full text-[#202631]" aria-hidden="true">
            <X className="size-4" />
          </span>
        </div>

        <TabsContent value="thread" className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              {data.selectedMessage ? (
                <div className="mb-4 rounded-[10px] border border-[#dfe7f2] bg-[#f5f9ff] p-3">
                  <p className="text-[11px] font-semibold uppercase text-[#60708a]">
                    Commenting on
                  </p>
                  <MarkdownPreview className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#1d2633]">
                    {data.selectedMessage.body}
                  </MarkdownPreview>
                </div>
              ) : null}

              {pinnedComment ? (
                <section>
                  <p className="mb-3 px-1 text-[13px] font-medium text-[#6d7788]">
                    Pinned
                  </p>
                  <CommentCard
                    actors={data.actors}
                    comment={pinnedComment}
                    onReact={
                      onReact
                        ? (reactionKind) =>
                            onReact(pinnedComment.id, "comment", reactionKind)
                        : undefined
                    }
                  />
                </section>
              ) : null}

              <section className="mt-6">
                <div className="mb-4 flex items-center justify-between px-1">
                  <p className="text-[13px] font-medium text-[#6d7788]">All comments</p>
                  <div
                    aria-disabled="true"
                    className="inline-flex h-8 cursor-default select-none items-center gap-1.5 rounded-full bg-[#f3f5f8] px-3 text-[12px] font-semibold text-[#687385]"
                  >
                    Newest
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </div>
                </div>
                <div className="space-y-4">
                  {regularComments.map((comment) => (
                    <CommentCard
                      actors={data.actors}
                      comment={comment}
                      key={comment.id}
                      onReact={
                        onReact
                          ? (reactionKind) =>
                              onReact(comment.id, "comment", reactionKind)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </section>
            </div>
            <CommentComposer
              permission={data.currentPermission}
              {...createCommentHandler}
            />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {data.activity.map((activity) => {
              const actor = actorFor(data.actors, activity.actorId);

              return (
                <div
                  className="rounded-[10px] border border-[#e4e9ef] bg-white p-3"
                  key={activity.id}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "grid size-7 place-items-center rounded-full text-[11px] font-bold",
                        actor.avatarClassName,
                      )}
                    >
                      {actor.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#151922]">
                        {actor.name}
                      </p>
                      <p className="text-[11px] text-[#808a99]">{activity.time}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[13px] leading-6 text-[#3a4350]">
                    {activity.label}
                  </p>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="participants" className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {data.presence.map((participant) => (
              <div
                className="flex h-12 items-center gap-3 rounded-[10px] px-2 hover:bg-[#f6f8fa]"
                key={participant.id}
              >
                <div
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-[12px] font-bold",
                    participant.avatarClassName,
                  )}
                >
                  {participant.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#151922]">
                    {participant.name}
                  </p>
                  <p className="text-[11px] text-[#7d8796]">{participant.roleLabel}</p>
                </div>
                <span className="size-2 rounded-full bg-[#19a76f]" />
              </div>
            ))}
            <div className="flex h-12 items-center gap-3 rounded-[10px] px-2 text-[#687385]">
              <div className="grid size-8 place-items-center rounded-full bg-[#f2f5f8] text-[12px] font-bold">
                +3
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">Additional viewers</p>
                <p className="text-[11px]">Visible through session presence</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
