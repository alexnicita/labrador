import {
  FileText,
  Folder,
  MoreHorizontal,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { BranchPreviewList } from "@/components/session/branch-preview-list";
import { SidebarPrimaryActions } from "@/components/session/sidebar-primary-actions";
import { SessionNavItem } from "@/components/session/session-nav-item";
import { VersionTimelinePreview } from "@/components/session/version-timeline-preview";
import type { SessionReplicaData } from "@/lib/session/types";

type SessionSidebarProps = {
  data: Pick<SessionReplicaData, "branches" | "session" | "versions">;
};

export function SessionSidebar({ data }: SessionSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 w-[250px] shrink-0 flex-col border-r border-[#dfe5eb] bg-[#fbfcfd] px-6 py-5">
      <div className="mb-8">
        <div className="grid size-8 place-items-center rounded-full text-[#111318]">
          <Sparkles className="size-6" aria-hidden="true" />
        </div>
      </div>

      <SidebarPrimaryActions />

      <div className="mt-8 min-h-0 flex-1 space-y-7 overflow-y-auto pr-1">
        <section>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-[#87909d]">
            Session
          </p>
          <div className="space-y-1">
            <SessionNavItem
              active
              label={data.session.title}
              trailing={<MoreHorizontal className="size-4 text-[#111318]" aria-hidden="true" />}
            />
            <SessionNavItem
              icon={<FileText className="size-4" aria-hidden="true" />}
              label="Context"
              badge={12}
            />
            <SessionNavItem
              icon={<Folder className="size-4" aria-hidden="true" />}
              label="Files"
              badge={5}
            />
          </div>
        </section>

        <VersionTimelinePreview versions={data.versions} />
        <BranchPreviewList branches={data.branches} />
      </div>

      <div className="mt-6 flex h-12 items-center gap-3 text-[12px] font-medium text-[#242b36]">
        <div className="grid size-8 place-items-center rounded-full bg-[#eef2f6]">
          <UsersRound className="size-4 text-[#1d2430]" aria-hidden="true" />
        </div>
        <span>{data.session.anonymousViewerCount} anonymous viewers</span>
        <span className="ml-auto size-1.5 rounded-full bg-[#19a76f]" />
      </div>
    </aside>
  );
}
