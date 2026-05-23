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
          <button
            type="button"
            className="flex h-8 w-full items-center gap-3 rounded-[8px] px-2 text-left text-[12px] font-medium text-[#26303c] transition-colors hover:bg-[#f1f4f7]"
            key={branch.id}
          >
            <GitBranch className="size-3.5 shrink-0 text-[#6e7784]" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{branch.label}</span>
            <span className="text-[11px] font-medium text-[#8a93a1]">
              {branch.versionCount}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="mt-4 w-full text-center text-[12px] font-medium text-[#596171] hover:text-[#111318]"
      >
        View all branches
      </button>
    </div>
  );
}
