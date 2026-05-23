import { Archive, Plus, Search } from "lucide-react";

import { SessionNavItem } from "@/components/session/session-nav-item";

export function SidebarPrimaryActions() {
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex h-12 w-full items-center gap-3 rounded-[9px] border border-[#dfe5eb] bg-white px-4 text-[13px] font-medium text-[#111318] shadow-[0_1px_0_rgba(13,18,28,0.02)] transition-colors hover:bg-[#f8fafc]"
      >
        <Plus className="size-4" aria-hidden="true" />
        New chat
      </button>
      <div className="space-y-1">
        <SessionNavItem
          icon={<Search className="size-4" aria-hidden="true" />}
          label="Search"
        />
        <SessionNavItem
          icon={<Archive className="size-4" aria-hidden="true" />}
          label="Archive"
        />
      </div>
    </div>
  );
}
