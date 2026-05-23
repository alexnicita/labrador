import { Eye, MessageSquareText, Smile, Sparkles, ThumbsUp } from "lucide-react";

import { MarkdownContent } from "@/components/session/markdown-content";
import type {
  Actor,
  CommentReaction,
  HumanMessage as HumanMessageType,
} from "@/lib/session/types";
import { cn } from "@/lib/utils";

type HumanMessageProps = {
  actor: Actor;
  message: HumanMessageType;
  onComment?: () => void;
  onReact?: (reactionKind: CommentReaction["kind"]) => void;
};

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

export function HumanMessage({ actor, message, onComment, onReact }: HumanMessageProps) {
  const showActions =
    message.reactions.length > 0 || message.commentCount > 0 || Boolean(onComment || onReact);
  const reactionCounts = new Map(
    message.reactions.map((reaction) => [reaction.kind, reaction.count ?? 0]),
  );

  return (
    <article
      className={cn(
        "flex w-full min-w-0 items-start gap-3 rounded-[14px] border px-2 py-3 transition-colors sm:gap-4 sm:px-3",
        message.selected
          ? "border-[#b7d4ff] bg-[#f5f9ff]"
          : "border-transparent bg-white hover:border-[#e2e8ef] hover:bg-[#fbfcfd]",
      )}
    >
      <div
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold shadow-sm",
          actor.avatarClassName,
        )}
      >
        {actor.initials}
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[14px] font-bold text-[#111318]">{actor.name}</span>
          <span className="text-[12px] text-[#7b8494]">{message.time}</span>
          <span className="text-[12px] font-medium text-[#7b8494]">{actor.roleLabel}</span>
        </div>
        <MarkdownContent
          className="mt-2 text-[14px] leading-6 text-[#141820]"
        >
          {message.body}
        </MarkdownContent>
        {showActions ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {reactionKinds.map((reactionKind) => {
              const count = reactionCounts.get(reactionKind) ?? 0;

              return (
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#e4e9ef] bg-white px-2.5 text-[12px] font-semibold text-[#2b3340] hover:bg-[#f7f9fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111318]/20"
                  key={reactionKind}
                  aria-label={`React with ${reactionKind.replaceAll("_", " ")}`}
                  {...(onReact ? { onClick: () => onReact(reactionKind) } : {})}
                >
                  {reactionIcon(reactionKind)}
                  {count > 0 ? <span>{count}</span> : null}
                </button>
              );
            })}
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#e4e9ef] bg-white px-2.5 text-[12px] font-semibold text-[#2b3340] hover:bg-[#f7f9fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111318]/20"
              aria-label={`${message.commentCount} comments`}
              {...(onComment ? { onClick: onComment } : {})}
            >
              <MessageSquareText className="size-3.5 text-[#2589ef]" aria-hidden="true" />
              <span>{message.commentCount}</span>
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
