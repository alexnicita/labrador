import { CornerDownRight, Eye, Smile, Sparkles, ThumbsUp, UserRound } from "lucide-react";

import { MarkdownContent } from "@/components/session/markdown-content";
import type { Actor, Comment, CommentReaction } from "@/lib/session/types";
import { cn } from "@/lib/utils";

type CommentCardProps = {
  comment: Comment;
  actors: Actor[];
  onReact?: (reactionKind: CommentReaction["kind"]) => void;
};

function findActor(actors: Actor[], actorId: string) {
  return actors.find((actor) => actor.id === actorId) ?? actors[0];
}

function reactionIcon(kind: CommentReaction["kind"]) {
  if (kind === "thumbs_up") {
    return <ThumbsUp className="size-3.5 text-[#f59f00]" aria-hidden="true" />;
  }

  if (kind === "sparkles") {
    return <Sparkles className="size-3.5 text-[#7c3aed]" aria-hidden="true" />;
  }

  if (kind === "eyes") {
    return <Eye className="size-3.5 text-[#2589ef]" aria-hidden="true" />;
  }

  return <Smile className="size-3.5 text-[#6d7480]" aria-hidden="true" />;
}

const reactionKinds: CommentReaction["kind"][] = [
  "thumbs_up",
  "smile",
  "sparkles",
  "eyes",
];

export function CommentCard({
  comment,
  actors,
  onReact,
}: CommentCardProps) {
  const actor = findActor(actors, comment.actorId);
  const reactionCounts = new Map(
    comment.reactions.map((reaction) => [reaction.kind, reaction.count ?? 0]),
  );

  return (
    <article className="min-w-0 rounded-[14px] bg-white p-3.5 shadow-[0_0_0_1px_rgba(213,221,231,0.85)]">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold",
            actor.avatarClassName,
          )}
        >
          {comment.anonymous ? (
            <UserRound className="size-4" aria-hidden="true" />
          ) : (
            actor.initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[13px] font-bold text-[#141820]">{actor.name}</span>
            <span className="text-[12px] text-[#7a8494]">{comment.time}</span>
            <span className="text-[11px] font-medium text-[#687385]">
              {actor.roleLabel}
            </span>
          </div>
          <MarkdownContent
            className="mt-2 text-[13px] leading-5 text-[#151922]"
          >
            {comment.body}
          </MarkdownContent>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {reactionKinds.map((reactionKind) => {
              const count = reactionCounts.get(reactionKind) ?? 0;

              return (
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border border-[#e4e9ef] bg-white px-2.5 text-[12px] font-semibold text-[#2b3340]",
                    onReact
                      ? "cursor-pointer hover:bg-[#f7f9fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111318]/20"
                      : "cursor-default opacity-60",
                  )}
                  key={reactionKind}
                  aria-label={`React with ${reactionKind.replaceAll("_", " ")}`}
                  disabled={!onReact}
                  {...(onReact ? { onClick: () => onReact(reactionKind) } : {})}
                >
                  {reactionIcon(reactionKind)}
                  {count > 0 ? <span>{count}</span> : null}
                </button>
              );
            })}
            <span
              aria-disabled="true"
              className="ml-auto cursor-default select-none text-[12px] font-semibold text-[#9aa3af]"
            >
              Reply
            </span>
          </div>

          {comment.replies?.length ? (
            <div className="mt-4 space-y-3 border-t border-[#edf1f5] pt-3">
              {comment.replies.map((reply) => {
                const replyActor = findActor(actors, reply.actorId);

                return (
                  <div className="flex gap-2.5" key={reply.id}>
                    <CornerDownRight
                      className="mt-1 size-4 shrink-0 text-[#a8b2bf]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1 rounded-[10px] bg-[#f7f9fb] px-3 py-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[13px] font-bold text-[#141820]">
                          {replyActor.name}
                        </span>
                        <span className="text-[12px] text-[#7a8494]">{reply.time}</span>
                        <span className="text-[11px] font-medium text-[#768091]">
                          {replyActor.roleLabel}
                        </span>
                      </div>
                      <MarkdownContent className="mt-1.5 text-[13px] leading-5 text-[#222936]">
                        {reply.body}
                      </MarkdownContent>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
