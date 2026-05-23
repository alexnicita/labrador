import { MousePointer2 } from "lucide-react";

import type { CollaboratorCursor as CollaboratorCursorType } from "@/lib/session/types";

type CollaboratorCursorProps = {
  cursor: CollaboratorCursorType;
};

export function CollaboratorCursor({ cursor }: CollaboratorCursorProps) {
  return (
    <div
      className="pointer-events-none absolute z-20 hidden translate-x-[-8px] translate-y-[-6px] lg:block"
      style={{ top: cursor.top, left: cursor.left, color: cursor.color }}
    >
      <MousePointer2
        className="size-6 rotate-[-12deg]"
        fill="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span
        className="ml-4 mt-[-2px] block rounded-[5px] px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
        style={{ backgroundColor: cursor.color }}
      >
        {cursor.label}
      </span>
    </div>
  );
}
