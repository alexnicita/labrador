export const DEMO_ROOM_ID = "hackathon-main";

export const DEMO_REACTION_KINDS = [
  "thumbs_up",
  "smile",
  "sparkles",
  "eyes",
] as const;

export type DemoReactionKind = (typeof DEMO_REACTION_KINDS)[number];

export type DemoFeedKind = "message" | "comment" | "reaction";

export type DemoActor = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type DemoFeedRow = {
  id: string;
  roomId: string;
  kind: DemoFeedKind;
  targetId: string | null;
  actor: DemoActor;
  body: string | null;
  reactionKind: DemoReactionKind | null;
  createdAt: string;
};

export type DemoMessageLimitState = {
  count: number;
  limit: number;
  remaining: number;
  reached: boolean;
  collaborationUrl: string;
};

export type DemoPresenceMember = {
  connectionId: string;
  actorId: string;
  displayName: string | null;
  role: string | null;
  anonymous: boolean;
  typing: boolean;
  focus: string | null;
  connectedAt?: string;
  lastSeenAt?: string;
};

export type DemoFeedMutationPayload = {
  row?: DemoFeedRow;
  rows?: DemoFeedRow[];
  removedId?: string;
  messageLimit?: DemoMessageLimitState;
  code?: string;
  message?: string;
};
