import type { VersionPreview } from "@/lib/session/types";
import { cn } from "@/lib/utils";

type VersionTimelinePreviewProps = {
  versions: VersionPreview[];
};

export function VersionTimelinePreview({ versions }: VersionTimelinePreviewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#87909d]">
            Versions
          </p>
          <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-[#161a22]">
            <span>Main branch</span>
            <span className="size-1.5 rounded-full bg-[#19a76f]" />
          </div>
        </div>
        <span className="mt-7 text-[11px] text-[#8a93a1]">Latest</span>
      </div>

      <ol className="relative space-y-0">
        <span className="absolute left-[7px] top-3 h-[calc(100%-22px)] w-px bg-[#cfd7e0]" />
        {versions.map((version) => (
          <li className="relative grid grid-cols-[20px_1fr] gap-2 pb-3" key={version.id}>
            <span
              className={cn(
                "relative z-10 mt-1 grid size-4 place-items-center rounded-full border border-[#c8d1dc] bg-white",
                version.active && "border-[#9bb6cf]",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full bg-transparent",
                  version.active && "bg-[#111318]",
                )}
              />
            </span>
            <div className="min-w-0">
              <div className="flex items-start gap-2 text-[12px]">
                <span className="w-6 shrink-0 font-semibold text-[#151922]">
                  {version.id}
                </span>
                <span className="min-w-0 truncate font-medium text-[#242936]">
                  {version.label}
                </span>
              </div>
              <p className="mt-1 truncate pl-8 text-[11px] text-[#8b94a3]">
                {version.author}
                <span className="mx-2"> </span>
                {version.time}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="ml-[58px] text-[12px] font-medium text-[#586170] hover:text-[#111318]"
      >
        View all versions
      </button>
    </div>
  );
}
