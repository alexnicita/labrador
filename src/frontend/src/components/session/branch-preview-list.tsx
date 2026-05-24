import { GitBranch } from "lucide-react";

import type { BranchPreview } from "@/lib/session/types";

type BranchPreviewListProps = {
  branches: BranchPreview[];
};

export function BranchPreviewList({ branches }: BranchPreviewListProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#87909d]">
        Branches
      </p>
      <div className="mt-4 space-y-2">
        {branches.map((branch) => (
          <div
            aria-disabled="true"
            className="flex h-8 w-full cursor-default select-none items-center gap-3 rounded-[8px] px-2 text-left text-[12px] font-medium text-[#26303c]"
            key={branch.id}
          >
            <GitBranch className="size-3.5 shrink-0 text-[#6e7784]" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{branch.label}</span>
            <span className="text-[11px] font-medium text-[#8a93a1]">
              {branch.versionCount}
            </span>
          </div>
        ))}
      </div>
      <div
        aria-disabled="true"
        className="mt-4 w-full cursor-default select-none text-center text-[12px] font-medium text-[#8a93a1]"
      >
        View all branches
      </div>
    </div>
  );
}
