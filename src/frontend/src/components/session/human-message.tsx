import type { Actor, HumanMessage as HumanMessageType } from "@/lib/session/types";
import { cn } from "@/lib/utils";

type HumanMessageProps = {
  actor: Actor;
  message: HumanMessageType;
};

export function HumanMessage({ actor, message }: HumanMessageProps) {
  return (
    <div className="flex items-start gap-4 px-3 sm:px-4">
      <div
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full text-[12px] font-bold shadow-sm",
          actor.avatarClassName,
        )}
      >
        {actor.initials}
      </div>
      <div className="min-w-0 pt-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[14px] font-bold text-[#111318]">{actor.name}</span>
          <span className="text-[12px] text-[#7b8494]">{message.time}</span>
          <span className="text-[12px] font-medium text-[#7b8494]">{actor.roleLabel}</span>
        </div>
        <p className="mt-3 text-[15px] leading-7 text-[#141820]">{message.body}</p>
      </div>
    </div>
  );
}
