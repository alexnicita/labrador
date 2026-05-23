import { Check, Circle } from "lucide-react";

import type { SessionReplicaData } from "@/lib/session/types";
import { cn } from "@/lib/utils";

type RunStatusDockProps = {
  run: SessionReplicaData["run"];
};

export function RunStatusDock({ run }: RunStatusDockProps) {
  return (
    <div className="border-b border-[#e5ebf1] px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3 text-[13px] font-medium text-[#151922]">
          <span className="grid size-5 place-items-center">
            <Circle className="size-3.5 fill-[#111318] text-[#111318]" aria-hidden="true" />
          </span>
          {run.label}
        </div>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[12px]">
          {run.steps.map((step) => (
            <div
              className={cn(
                "flex h-6 items-center gap-2 whitespace-nowrap text-[#687385]",
                step.status === "active" && "font-semibold text-[#111318]",
                step.status === "complete" && "text-[#222936]",
              )}
              key={step.id}
            >
              {step.status === "complete" ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <span
                  className={cn(
                    "size-1.5 rounded-full bg-[#c8d1dc]",
                    step.status === "active" && "bg-[#111318]",
                  )}
                />
              )}
              {step.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
