import type { Actor, SessionReplicaData } from "@/lib/session/types";

const actors: Actor[] = [
  {
    id: "marcus",
    name: "Scout Corgi",
    initials: "SC",
    role: "editor",
    roleLabel: "Builder",
    avatarClassName: "bg-[#b9dfca] text-[#113527]",
  },
  {
    id: "laura",
    name: "Pixel Poodle",
    initials: "PP",
    role: "commenter",
    roleLabel: "Commentator",
    avatarClassName: "bg-[#dcc8ff] text-[#301257]",
  },
  {
    id: "diego",
    name: "Rocket Beagle",
    initials: "RB",
    role: "commenter",
    roleLabel: "Commentator",
    avatarClassName: "bg-[#ffd9a6] text-[#573007]",
  },
  {
    id: "priya",
    name: "Clover Collie",
    initials: "CC",
    role: "commenter",
    roleLabel: "Commentator",
    avatarClassName: "bg-[#bcd8ff] text-[#0b2b52]",
  },
  {
    id: "anonymous",
    name: "Anonymous dog",
    initials: "AD",
    role: "anonymous_viewer",
    roleLabel: "Viewer",
    avatarClassName: "bg-[#f3f5f8] text-[#56606f]",
  },
  {
    id: "ai",
    name: "AI",
    initials: "AI",
    role: "ai",
    roleLabel: "AI",
    avatarClassName: "bg-white text-[#14171a]",
  },
];

export const sessionReplicaData: SessionReplicaData = {
  session: {
    title: "Hackathon Prompt Room",
    subtitle: "Public collaborative demo",
    liveCount: 7,
    viewerCount: 23,
    anonymousViewerCount: 23,
  },
  currentPermission: {
    canComment: true,
    canEditPrompt: false,
    canCreateBranches: false,
    message:
      "You can view and comment, but you don't have permission to edit or create new branches.",
  },
  actors,
  commenters: actors.filter((actor) =>
    ["diego", "laura", "priya", "anonymous"].includes(actor.id),
  ),
  presence: actors
    .filter((actor) => ["marcus", "laura", "diego", "priya"].includes(actor.id))
    .map((actor) => ({ ...actor, active: true })),
  versions: [
    {
      id: "v7",
      label: "Markdown tables enabled",
      author: "Labrador AI",
      time: "Now",
      active: true,
    },
    {
      id: "v6",
      label: "Realtime reactions synced",
      author: "Labrador",
      time: "Today",
    },
    {
      id: "v5",
      label: "Comments saved to room",
      author: "Labrador",
      time: "Today",
    },
    {
      id: "v4",
      label: "Public room opened",
      author: "Labrador",
      time: "Today",
    },
  ],
  branches: [
    {
      id: "shared-thread",
      label: "Shared prompt thread",
      versionCount: "live room",
    },
    {
      id: "ai-replies",
      label: "AI answer archive",
      versionCount: "saved replies",
    },
    {
      id: "side-comments",
      label: "Side comments",
      versionCount: "team notes",
    },
  ],
  kickoffMessage: {
    id: "msg-1",
    actorId: "marcus",
    time: "10:21 AM",
    body: "Drop the first shared prompt here.",
    reactions: [],
    commentCount: 0,
  },
  messages: [
    {
      id: "msg-1",
      actorId: "marcus",
      time: "10:21 AM",
      body: "Drop the first shared prompt here.",
      reactions: [],
      commentCount: 0,
    },
  ],
  selectedMessageId: "msg-1",
  cursors: [
    {
      id: "cursor-laura",
      actorId: "laura",
      label: "Pixel Poodle",
      color: "#7c3aed",
      top: "-7%",
      left: "47%",
    },
    {
      id: "cursor-diego",
      actorId: "diego",
      label: "Rocket Beagle",
      color: "#13a66b",
      top: "30%",
      left: "93%",
    },
    {
      id: "cursor-taylor",
      actorId: "marcus",
      label: "Scout Corgi",
      color: "#2589ef",
      top: "56%",
      left: "-1%",
    },
    {
      id: "cursor-priya",
      actorId: "priya",
      label: "Clover Collie",
      color: "#ff9400",
      top: "66%",
      left: "93%",
    },
  ],
  document: {
    title: "Live Team Insight Brief",
    summary:
      "Shared prompts, AI answers, reactions, and comments become the working memory for the room.",
    targetAudience: [
      {
        segment: "Builders",
        description: "Hackathon teammates exploring ideas",
        primaryNeed: "Move from vague prompt to useful output",
        angle: "Shared context, visible decisions",
      },
      {
        segment: "Reviewers",
        description: "People reacting and commenting live",
        primaryNeed: "Understand what is working fast",
        angle: "Comments, reactions, and activity",
      },
      {
        segment: "Demo visitors",
        description: "Anyone opening the public link",
        primaryNeed: "Join without setup",
        angle: "Anonymous dog names and realtime presence",
      },
    ],
    pillars: [
      {
        id: "collaboration",
        title: "Prompt together",
        body: "Every prompt and AI answer appears in the shared room for everyone.",
        tone: "green",
      },
      {
        id: "impact",
        title: "React and comment",
        body: "Use lightweight feedback to steer the next useful response.",
        tone: "blue",
      },
      {
        id: "enterprise",
        title: "Keep the thread durable",
        body: "The public demo saves prompts, comments, reactions, and AI replies.",
        tone: "purple",
      },
    ],
  },
  run: {
    status: "running",
    label: "AI is working...",
    steps: [
      { id: "brief", label: "Analyzing brief", status: "complete" },
      { id: "research", label: "Researching audience", status: "complete" },
      { id: "draft", label: "Drafting plan", status: "active" },
      { id: "final", label: "Finalizing", status: "pending" },
    ],
  },
  comments: [
    {
      id: "comment-diego",
      actorId: "diego",
      time: "10:27 AM",
      body: "Should we lead with outcomes instead of features here?",
      pinned: true,
      reactions: [
        { id: "thumbs", kind: "thumbs_up", count: 3 },
        { id: "smile", kind: "smile" },
      ],
    },
    {
      id: "comment-laura",
      actorId: "laura",
      time: "10:28 AM",
      body: "What about adding a line on scalability?",
      reactions: [
        { id: "thumbs", kind: "thumbs_up", count: 2 },
        { id: "smile", kind: "smile" },
      ],
      replies: [
        {
          id: "reply-marcus",
          actorId: "marcus",
          time: "10:29 AM",
          body: "Good call, added to the draft.",
          reactions: [],
        },
      ],
    },
    {
      id: "comment-priya",
      actorId: "priya",
      time: "10:30 AM",
      body: "Let's include a proof point from customer story.",
      reactions: [
        { id: "thumbs", kind: "thumbs_up", count: 1 },
        { id: "smile", kind: "smile" },
      ],
    },
    {
      id: "comment-anon",
      actorId: "anonymous",
      time: "10:31 AM",
      body: "Loving this direction!",
      anonymous: true,
      reactions: [],
    },
  ],
  activity: [
    {
      id: "activity-run",
      actorId: "marcus",
      time: "10:22 AM",
      label: "Started a run from version v7.",
    },
    {
      id: "activity-comment",
      actorId: "diego",
      time: "10:27 AM",
      label: "Pinned a comment on the AI output.",
    },
    {
      id: "activity-version",
      actorId: "ai",
      time: "10:31 AM",
      label: "Drafted the launch plan artifact.",
    },
  ],
};

export function getActor(actorId: string) {
  return actors.find((actor) => actor.id === actorId) ?? actors[0];
}
