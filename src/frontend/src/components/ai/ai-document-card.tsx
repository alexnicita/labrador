import { Sparkles } from "lucide-react";

import { MessagingPillarCards } from "@/components/ai/messaging-pillar-cards";
import { TargetAudienceTable } from "@/components/ai/target-audience-table";
import type { SessionReplicaData } from "@/lib/session/types";

type AIDocumentCardProps = {
  document: SessionReplicaData["document"];
};

export function AIDocumentCard({ document }: AIDocumentCardProps) {
  return (
    <article className="rounded-[20px] border border-[#dfe5eb] bg-white px-6 py-6 shadow-[0_1px_0_rgba(13,18,28,0.03)] sm:px-9 sm:py-6">
      <div className="mb-4 flex items-center gap-3 text-[13px]">
        <div className="grid size-6 place-items-center rounded-full text-[#111318]">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
        <span className="font-semibold text-[#12151c]">AI</span>
        <span className="text-[#768091]">10:22 AM</span>
      </div>

      <div className="border-b border-[#dfe5eb] pb-4">
        <h2 className="text-[28px] font-bold tracking-[-0.01em] text-[#111318] sm:text-[30px]">
          {document.title}
        </h2>
        <p className="mt-2 text-[15px] leading-6 text-[#465264]">{document.summary}</p>
      </div>

      <section className="mt-6">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[18px] font-semibold text-[#111318]">1.</span>
          <h3 className="text-[19px] font-bold text-[#111318]">Objective</h3>
        </div>
        <p className="mt-2 text-[15px] leading-6 text-[#111827]">
          Generate strong market awareness and drive qualified sign-ups that convert into
          active users.
        </p>
      </section>

      <section className="mt-6">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[18px] font-semibold text-[#111318]">2.</span>
          <h3 className="text-[19px] font-bold text-[#111318]">Target Audience</h3>
        </div>
        <div className="mt-3">
          <TargetAudienceTable rows={document.targetAudience} />
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-baseline gap-3">
          <span className="font-mono text-[18px] font-semibold text-[#111318]">3.</span>
          <h3 className="text-[19px] font-bold text-[#111318]">Messaging Pillars</h3>
        </div>
        <MessagingPillarCards pillars={document.pillars} />
      </section>
    </article>
  );
}
