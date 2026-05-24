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
            <div
              className={cn(
                "relative grid size-10 cursor-default place-items-center rounded-[12px] text-[#87909d]",
                index === 0 && "mb-2 border border-[#dfe5eb] bg-white",
                active && "bg-[#edf3f8] text-[#111318]",
              )}
              title={item.label}
              key={item.label}
            >
              {active ? (
                <span className="absolute left-[-13px] h-6 w-1 rounded-r-full bg-[#111318]" />
              ) : null}
              <Icon className="size-4" aria-hidden="true" />
              <span className="sr-only">{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div
        className="grid size-10 cursor-default place-items-center rounded-[12px] text-[#87909d]"
        title={`${data.session.anonymousViewerCount} anonymous viewers`}
      >
        <UsersRound className="size-4" aria-hidden="true" />
        <span className="sr-only">
          {data.session.anonymousViewerCount} anonymous viewers
        </span>
      </div>
    </aside>
  );
}
