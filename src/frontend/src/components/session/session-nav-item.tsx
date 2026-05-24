import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SessionNavItemProps = {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  badge?: string | number;
  trailing?: ReactNode;
  className?: string;
};

export function SessionNavItem({
  icon,
  label,
  active,
  badge,
  trailing,
  className,
}: SessionNavItemProps) {
  return (
    <div
      aria-current={active ? "page" : undefined}
      aria-disabled="true"
      className={cn(
        "flex h-9 w-full cursor-default select-none items-center gap-3 rounded-[9px] px-3 text-left text-[13px] font-medium text-[#20242d]",
        active && "bg-[#eef2f7] text-[#0c0f14]",
        className,
      )}
    >
      {icon ? <span className="grid size-4 shrink-0 place-items-center">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge !== undefined ? (
        <span className="grid min-w-6 place-items-center rounded-full bg-[#e6ebf0] px-1.5 py-0.5 text-[11px] font-semibold text-[#6b7280]">
          {badge}
        </span>
      ) : null}
      {trailing}
    </div>
  );
}
