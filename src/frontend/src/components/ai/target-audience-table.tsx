import type { TargetAudienceRow } from "@/lib/session/types";

type TargetAudienceTableProps = {
  rows: TargetAudienceRow[];
};

export function TargetAudienceTable({ rows }: TargetAudienceTableProps) {
  return (
    <div className="overflow-hidden rounded-[9px] border border-[#dfe5eb]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[12.5px]">
          <thead className="bg-white">
            <tr className="border-b border-[#dfe5eb]">
              <th className="w-[20%] px-4 py-2.5 font-semibold text-[#111318]">
                Segment
              </th>
              <th className="w-[29%] border-l border-[#e4e9ef] px-4 py-2.5 font-semibold text-[#111318]">
                Description
              </th>
              <th className="w-[26%] border-l border-[#e4e9ef] px-4 py-2.5 font-semibold text-[#111318]">
                Primary Need
              </th>
              <th className="w-[25%] border-l border-[#e4e9ef] px-4 py-2.5 font-semibold text-[#111318]">
                Our Angle
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-[#edf1f5] last:border-b-0" key={row.segment}>
                <td className="px-4 py-2.5 font-medium text-[#161a22]">
                  {row.segment}
                </td>
                <td className="border-l border-[#edf1f5] px-4 py-2.5 text-[#202632]">
                  {row.description}
                </td>
                <td className="border-l border-[#edf1f5] px-4 py-2.5 text-[#202632]">
                  {row.primaryNeed}
                </td>
                <td className="border-l border-[#edf1f5] px-4 py-2.5 text-[#202632]">
                  {row.angle}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
