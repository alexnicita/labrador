import { Sparkles } from "lucide-react";

import { MessagingPillarCards } from "@/components/ai/messaging-pillar-cards";
import { TargetAudienceTable } from "@/components/ai/target-audience-table";
import type { SessionReplicaData } from "@/lib/session/types";

type AIDocumentCardProps = {
  document: SessionReplicaData["document"];
};

export function AIDocumentCard({ document }: AIDocumentCardProps) {
  return (
    <article className="bg-white px-5 py-4 sm:px-7 sm:py-4">
      <div className="mb-3 flex items-center gap-3 text-[12px]">
        <div className="grid size-6 place-items-center rounded-full text-[#111318]">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
        <span className="font-semibold text-[#12151c]">AI</span>
        <span className="text-[#768091]">10:22 AM</span>
      </div>

      <div className="border-b border-[#dfe5eb] pb-4">
        <h2 className="max-w-[760px] text-[24px] font-bold leading-tight text-[#111318] sm:text-[25px]">
          {document.title}
        </h2>
        <p className="mt-2 max-w-[780px] text-[14px] leading-6 text-[#465264]">
          {document.summary}
        </p>
      </div>

      <section className="mt-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[17px] font-semibold text-[#111318]">1.</span>
          <h3 className="text-[18px] font-bold text-[#111318]">Room goal</h3>
        </div>
        <p className="mt-2 max-w-[820px] text-[14px] leading-6 text-[#111827]">
          Turn shared prompts, comments, and AI replies into useful team insight.
        </p>
      </section>

      <section className="mt-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[17px] font-semibold text-[#111318]">2.</span>
          <h3 className="text-[18px] font-bold text-[#111318]">Participants</h3>
        </div>
        <div className="mt-3">
          <TargetAudienceTable rows={document.targetAudience} />
        </div>
      </section>

      <section className="mt-4">
        <div className="mb-3 flex items-baseline gap-3">
          <span className="font-mono text-[17px] font-semibold text-[#111318]">3.</span>
          <h3 className="text-[18px] font-bold text-[#111318]">Collaboration modes</h3>
        </div>
        <MessagingPillarCards pillars={document.pillars} />
      </section>
    </article>
  );
}
