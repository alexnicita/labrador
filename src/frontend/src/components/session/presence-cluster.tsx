import type { Actor } from "@/lib/session/types";
import { cn } from "@/lib/utils";

type PresenceClusterProps = {
  participants: Actor[];
  overflowCount?: number;
  maxVisible?: number;
  ariaLabel?: string;
};

export function PresenceCluster({
  ariaLabel = "Visible collaborators",
  maxVisible = 5,
  participants,
  overflowCount = 0,
}: PresenceClusterProps) {
  const visibleParticipants = participants.slice(0, maxVisible);
  const hiddenCount = Math.max(participants.length - visibleParticipants.length, 0);
  const totalOverflowCount = hiddenCount + Math.max(overflowCount, 0);

  return (
    <div className="flex items-center -space-x-2" aria-label={ariaLabel}>
      {visibleParticipants.map((participant) => (
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
      {totalOverflowCount > 0 ? (
        <div
          className="grid size-9 place-items-center rounded-full border-2 border-white bg-[#f2f5f9] text-[12px] font-semibold text-[#4e5868] shadow-sm"
          title={`${totalOverflowCount} more`}
        >
          +{totalOverflowCount}
        </div>
      ) : null}
    </div>
  );
}
