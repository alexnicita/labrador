import {
  Archive,
  FileText,
  Folder,
  GitBranch,
  Plus,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";

import type { SessionReplicaData } from "@/lib/session/types";
import { cn } from "@/lib/utils";

type SessionSidebarRailProps = {
  data: Pick<SessionReplicaData, "session">;
};

const railItems = [
  { label: "New chat", icon: Plus },
  { label: "Search", icon: Search },
  { label: "Archive", icon: Archive },
  { label: "Context", icon: FileText },
  { label: "Files", icon: Folder },
  { label: "Branches", icon: GitBranch },
];

export function SessionSidebarRail({ data }: SessionSidebarRailProps) {
  return (
    <aside
      aria-label="Collapsed session navigation"
      className="flex h-full w-16 flex-col items-center border-r border-[#dfe5eb] bg-[#fbfcfd] py-4"
    >
      <div className="mb-4 grid size-10 place-items-center rounded-[12px] text-[#111318]">
        <Sparkles className="size-5" aria-hidden="true" />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1" aria-label="Session rail">
        {railItems.map((item, index) => {
          const Icon = item.icon;
          const active = item.label === "Context";

          return (
            <button
              type="button"
              className={cn(
                "relative grid size-10 place-items-center rounded-[12px] text-[#485364] transition-colors hover:bg-[#eef2f6] hover:text-[#111318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111318]/20",
                index === 0 && "mb-2 border border-[#dfe5eb] bg-white text-[#111318]",
                active && "bg-[#edf3f8] text-[#111318]",
              )}
              title={item.label}
              aria-label={item.label}
              key={item.label}
            >
              {active ? (
                <span className="absolute left-[-13px] h-6 w-1 rounded-r-full bg-[#111318]" />
              ) : null}
              <Icon className="size-4" aria-hidden="true" />
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className="grid size-10 place-items-center rounded-[12px] text-[#485364] hover:bg-[#eef2f6] hover:text-[#111318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111318]/20"
        title={`${data.session.anonymousViewerCount} anonymous viewers`}
        aria-label={`${data.session.anonymousViewerCount} anonymous viewers`}
      >
        <UsersRound className="size-4" aria-hidden="true" />
      </button>
    </aside>
  );
}
