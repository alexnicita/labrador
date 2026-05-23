import type { ReactNode } from "react";
import { ChevronDown, Circle } from "lucide-react";

import { MobileCollaborationSheet } from "@/components/session/mobile-collaboration-sheet";
import { PresenceCluster } from "@/components/session/presence-cluster";
import { SessionOverflowMenu } from "@/components/session/session-overflow-menu";
import { ShareSessionButton } from "@/components/session/share-session-button";
import { ViewerCountBadge } from "@/components/session/viewer-count-badge";
import type { SessionReplicaData } from "@/lib/session/types";

type SessionHeaderProps = {
  data: Pick<SessionReplicaData, "presence" | "session">;
  mobileCollaborationPanel: ReactNode;
};

export function SessionHeader({
  data,
  mobileCollaborationPanel,
}: SessionHeaderProps) {
  const overflowCount = Math.max(data.session.liveCount - data.presence.length, 0);

  return (
    <header className="flex min-h-20 shrink-0 items-center justify-between gap-4 border-b border-[#e0e6ed] bg-white/92 px-4 py-4 sm:px-8 lg:min-h-24">
      <div className="min-w-0">
        <button
          type="button"
          className="flex max-w-full items-center gap-2 text-left"
          aria-label="Open session switcher"
        >
          <h1 className="truncate text-[18px] font-bold tracking-[-0.01em] text-[#101318]">
            {data.session.title}
          </h1>
          <ChevronDown className="size-4 shrink-0 text-[#111318]" aria-hidden="true" />
        </button>
        <p className="mt-1 text-[13px] font-medium text-[#7b8494]">
          {data.session.subtitle}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <div className="hidden items-center gap-4 xl:flex">
          <PresenceCluster participants={data.presence} overflowCount={overflowCount} />
          <div className="flex h-8 items-center gap-2 text-[13px] font-semibold text-[#151922]">
            <Circle className="size-2 fill-[#19a76f] text-[#19a76f]" aria-hidden="true" />
            {data.session.liveCount} in session
          </div>
          <ViewerCountBadge count={data.session.viewerCount} />
        </div>
        <MobileCollaborationSheet liveCount={data.session.liveCount}>
          {mobileCollaborationPanel}
        </MobileCollaborationSheet>
        <div className="hidden sm:block">
          <ShareSessionButton />
        </div>
        <SessionOverflowMenu />
      </div>
    </header>
  );
}
