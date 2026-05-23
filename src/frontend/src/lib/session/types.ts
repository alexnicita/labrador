import type {
  LabradorRunStatus,
  LabradorRunStep,
} from "@/lib/ai/types";

export type ActorRole =
  | "owner"
  | "admin"
  | "editor"
  | "commenter"
  | "viewer"
  | "anonymous_viewer"
  | "ai";

export type Actor = {
  id: string;
  name: string;
  initials: string;
  role: ActorRole;
  roleLabel: string;
  avatarClassName: string;
};

export type PresenceActor = Actor & {
  active: boolean;
};

export type HumanMessage = {
  id: string;
  actorId: string;
  time: string;
  body: string;
  reactions: CommentReaction[];
  commentCount: number;
  selected?: boolean;
};

export type CollaboratorCursor = {
  id: string;
  actorId: string;
  label: string;
  color: string;
  top: string;
  left: string;
};

export type VersionPreview = {
  id: string;
  label: string;
  author: string;
  time: string;
  active?: boolean;
};

export type BranchPreview = {
  id: string;
  label: string;
  versionCount: string;
};

export type TargetAudienceRow = {
  segment: string;
  description: string;
  primaryNeed: string;
  angle: string;
};

export type MessagingPillar = {
  id: string;
  title: string;
  body: string;
  tone: "green" | "blue" | "purple";
};

export type CommentReaction = {
  id: string;
  kind: "thumbs_up" | "smile" | "sparkles" | "eyes";
  count?: number;
};

export type Comment = {
  id: string;
  actorId: string;
  targetId?: string | null;
  time: string;
  body: string;
  pinned?: boolean;
  anonymous?: boolean;
  reactions: CommentReaction[];
  replies?: Comment[];
};

export type ActivityItem = {
  id: string;
  actorId: string;
  time: string;
  label: string;
};

export type PermissionState = {
  canComment: boolean;
  canEditPrompt: boolean;
  canCreateBranches: boolean;
  message: string;
};

export type SessionReplicaData = {
  session: {
    title: string;
    subtitle: string;
    liveCount: number;
    viewerCount: number;
    anonymousViewerCount: number;
  };
  currentPermission: PermissionState;
  actors: Actor[];
  presence: PresenceActor[];
  versions: VersionPreview[];
  branches: BranchPreview[];
  kickoffMessage: HumanMessage;
  messages: HumanMessage[];
  selectedMessageId: string | null;
  selectedMessage?: HumanMessage;
  cursors: CollaboratorCursor[];
  document: {
    title: string;
    summary: string;
    targetAudience: TargetAudienceRow[];
    pillars: MessagingPillar[];
  };
  run: {
    status: LabradorRunStatus;
    label: string;
    steps: LabradorRunStep[];
  };
  comments: Comment[];
  activity: ActivityItem[];
};
