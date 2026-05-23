import type { Actor, SessionReplicaData } from "@/lib/session/types";

const actors: Actor[] = [
  {
    id: "marcus",
    name: "Marcus T.",
    initials: "MT",
    role: "editor",
    roleLabel: "Analyst",
    avatarClassName: "bg-[#b9dfca] text-[#113527]",
  },
  {
    id: "laura",
    name: "Laura K.",
    initials: "LK",
    role: "commenter",
    roleLabel: "Commentator",
    avatarClassName: "bg-[#dcc8ff] text-[#301257]",
  },
  {
    id: "diego",
    name: "Diego R.",
    initials: "DR",
    role: "commenter",
    roleLabel: "Commentator",
    avatarClassName: "bg-[#ffd9a6] text-[#573007]",
  },
  {
    id: "priya",
    name: "Priya K.",
    initials: "PK",
    role: "commenter",
    roleLabel: "Commentator",
    avatarClassName: "bg-[#bcd8ff] text-[#0b2b52]",
  },
  {
    id: "anonymous",
    name: "Anonymous viewer",
    initials: "AV",
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
    title: "Q2 Launch Marketing Plan",
    subtitle: "Shared session",
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
  presence: actors
    .filter((actor) => ["marcus", "laura", "diego", "priya"].includes(actor.id))
    .map((actor) => ({ ...actor, active: true })),
  versions: [
    {
      id: "v7",
      label: "Refined messaging pillars",
      author: "Marcus T.",
      time: "10:42 AM",
      active: true,
    },
    {
      id: "v6",
      label: "Added audience insights",
      author: "Priya K.",
      time: "Yesterday",
    },
    {
      id: "v5",
      label: "Campaign roadmap",
      author: "Taylor M.",
      time: "May 20",
    },
    {
      id: "v4",
      label: "Initial draft",
      author: "Laura K.",
      time: "May 18",
    },
  ],
  branches: [
    {
      id: "paid-media",
      label: "Paid media strategy",
      versionCount: "4 versions",
    },
    {
      id: "website",
      label: "Website messaging",
      versionCount: "3 versions",
    },
    {
      id: "email",
      label: "Email campaign",
      versionCount: "2 versions",
    },
  ],
  kickoffMessage: {
    id: "msg-1",
    actorId: "marcus",
    time: "10:21 AM",
    body: "Let's build the Q2 launch marketing plan.",
  },
  cursors: [
    {
      id: "cursor-laura",
      actorId: "laura",
      label: "Laura K.",
      color: "#7c3aed",
      top: "-6%",
      left: "43.5%",
    },
    {
      id: "cursor-diego",
      actorId: "diego",
      label: "Diego R.",
      color: "#13a66b",
      top: "28.5%",
      left: "82%",
    },
    {
      id: "cursor-taylor",
      actorId: "marcus",
      label: "Taylor M.",
      color: "#2589ef",
      top: "55%",
      left: "4%",
    },
    {
      id: "cursor-priya",
      actorId: "priya",
      label: "Priya K.",
      color: "#ff9400",
      top: "58.5%",
      left: "88%",
    },
  ],
  document: {
    title: "Q2 Launch Marketing Plan",
    summary:
      "A comprehensive plan to drive awareness, acquisition, and activation for our Q2 product launch.",
    targetAudience: [
      {
        segment: "IT Leaders",
        description: "Directors, VPs of IT",
        primaryNeed: "Reduce risk and complexity",
        angle: "Security, reliability, control",
      },
      {
        segment: "Operations Leaders",
        description: "Heads of Ops, PMO",
        primaryNeed: "Improve efficiency",
        angle: "Automation, visibility, speed",
      },
      {
        segment: "Power Users",
        description: "Technical individual contributors",
        primaryNeed: "Do their best work",
        angle: "Focus, flow, productivity",
      },
    ],
    pillars: [
      {
        id: "collaboration",
        title: "Built for collaboration",
        body: "Break down silos and bring everyone together in one connected workspace.",
        tone: "green",
      },
      {
        id: "impact",
        title: "Drive measurable impact",
        body: "Turn goals into results with clarity, speed, and confidence.",
        tone: "blue",
      },
      {
        id: "enterprise",
        title: "Enterprise-ready by design",
        body: "Security, scalability, and reliability you can count on.",
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
