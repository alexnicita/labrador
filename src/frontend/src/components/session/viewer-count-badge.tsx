import { Eye } from "lucide-react";

type ViewerCountBadgeProps = {
  count: number;
  label?: string;
};

export function ViewerCountBadge({ count, label = "viewers" }: ViewerCountBadgeProps) {
  return (
    <div className="hidden h-8 items-center gap-2 whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium text-[#151922] md:flex">
      <Eye className="size-4 text-[#1a1d24]" aria-hidden="true" />
      <span>
        {count} {label}
      </span>
    </div>
  );
}
