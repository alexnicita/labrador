import { CornerDownRight, Smile, ThumbsUp, UserRound } from "lucide-react";

import type { Actor, Comment } from "@/lib/session/types";
import { cn } from "@/lib/utils";

type CommentCardProps = {
  comment: Comment;
  actors: Actor[];
  compact?: boolean;
  depth?: number;
};

function findActor(actors: Actor[], actorId: string) {
  return actors.find((actor) => actor.id === actorId) ?? actors[0];
}

export function CommentCard({
  comment,
  actors,
  compact,
  depth = 0,
}: CommentCardProps) {
  const actor = findActor(actors, comment.actorId);

  return (
    <article
      className={cn(
        "rounded-[10px] border border-[#e1e7ee] bg-white p-4 shadow-[0_1px_0_rgba(13,18,28,0.02)]",
        compact && "border-0 p-0 shadow-none",
        depth > 0 && "ml-7 border-0 bg-transparent p-0 shadow-none",
      )}
    >
      <div className="flex items-start gap-3">
        {depth > 0 ? (
          <CornerDownRight className="mt-1 size-4 shrink-0 text-[#b1bac6]" aria-hidden="true" />
        ) : null}
        <div
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold",
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[13px] font-bold text-[#141820]">{actor.name}</span>
            <span className="text-[12px] text-[#7a8494]">{comment.time}</span>
            <span className="text-[11px] font-medium text-[#768091]">
              {actor.roleLabel}
            </span>
          </div>
          <p className="mt-2 text-[13px] leading-6 text-[#151922]">{comment.body}</p>

          {comment.reactions.length > 0 ? (
            <div className="mt-3 flex items-center gap-2">
              {comment.reactions.map((reaction) => (
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#e4e9ef] bg-white px-2.5 text-[12px] font-semibold text-[#2b3340] hover:bg-[#f7f9fb]"
                  key={reaction.id}
                >
                  {reaction.kind === "thumbs_up" ? (
                    <ThumbsUp className="size-3.5 text-[#f59f00]" aria-hidden="true" />
                  ) : (
                    <Smile className="size-3.5 text-[#6d7480]" aria-hidden="true" />
                  )}
                  {reaction.count ? <span>{reaction.count}</span> : null}
                </button>
              ))}
              <button
                type="button"
                className="ml-auto text-[12px] font-medium text-[#7c8494] hover:text-[#111318]"
              >
                Reply
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="mt-3 text-[12px] font-medium text-[#7c8494] hover:text-[#111318]"
            >
              Reply
            </button>
          )}

          {comment.replies?.length ? (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentCard
                  actors={actors}
                  comment={reply}
                  compact
                  depth={depth + 1}
                  key={reply.id}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
