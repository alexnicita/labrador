import type { UIMessage } from "ai";

export type LabradorRunStatus =
  | "queued"
  | "running"
  | "waiting_for_tool"
  | "waiting_for_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type LabradorRunStepStatus = "complete" | "active" | "pending";

export type LabradorRunStep = {
  id: string;
  label: string;
  status: LabradorRunStepStatus;
};

export type LabradorAIMessage = UIMessage<{
  runId: string;
  sessionId: string;
}>;
