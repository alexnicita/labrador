import { LockKeyhole, Users, Zap } from "lucide-react";

import type { MessagingPillar } from "@/lib/session/types";
import { cn } from "@/lib/utils";

type MessagingPillarCardsProps = {
  pillars: MessagingPillar[];
};

const pillarStyles = {
  green: {
    icon: Users,
    className: "text-[#12a162]",
  },
  blue: {
    icon: Zap,
    className: "text-[#2589ef]",
  },
  purple: {
    icon: LockKeyhole,
    className: "text-[#7c3aed]",
  },
} satisfies Record<
  MessagingPillar["tone"],
  { icon: typeof Users; className: string }
>;

export function MessagingPillarCards({ pillars }: MessagingPillarCardsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {pillars.map((pillar) => {
        const style = pillarStyles[pillar.tone];
        const Icon = style.icon;

        return (
          <article
            className="min-h-[124px] rounded-[10px] border border-[#dfe5eb] bg-white p-4 shadow-[0_1px_0_rgba(13,18,28,0.02)]"
            key={pillar.id}
          >
            <div className="flex items-center gap-3">
              <Icon className={cn("size-5", style.className)} aria-hidden="true" />
              <h4 className="text-[13px] font-bold text-[#111318]">{pillar.title}</h4>
            </div>
            <p className="mt-3 text-[13px] leading-5 text-[#3c4655]">{pillar.body}</p>
          </article>
        );
      })}
    </div>
  );
}
