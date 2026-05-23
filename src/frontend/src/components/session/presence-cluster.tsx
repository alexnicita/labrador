import type { PresenceActor } from "@/lib/session/types";
import { cn } from "@/lib/utils";

type PresenceClusterProps = {
  participants: PresenceActor[];
  overflowCount: number;
};

export function PresenceCluster({
  participants,
  overflowCount,
}: PresenceClusterProps) {
  return (
    <div className="flex items-center -space-x-2" aria-label="Visible collaborators">
      {participants.map((participant) => (
        <div
          className={cn(
            "grid size-9 place-items-center rounded-full border-2 border-white text-[12px] font-semibold shadow-sm",
            participant.avatarClassName,
          )}
          key={participant.id}
          title={`${participant.name}, ${participant.roleLabel}`}
        >
          {participant.initials}
        </div>
      ))}
      <div className="grid size-9 place-items-center rounded-full border-2 border-white bg-[#f2f5f9] text-[12px] font-semibold text-[#4e5868] shadow-sm">
        +{overflowCount}
      </div>
    </div>
  );
}
