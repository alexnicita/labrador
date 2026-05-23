# Labrador PRFAQ

## Press Release

### Labrador launches the first multiplayer workspace for AI prompting and agent work

Labrador today introduces a realtime collaboration workspace for teams working with AI.
The product brings Google Docs-style multiplayer editing, comments, permissions, and
share links to Codex-like AI sessions, so teams can prompt, review, branch, and ship AI
work together.

Until now, most AI work has happened in private chat windows. One teammate prompts, the
AI generates, and everyone else reacts later through screenshots, pasted transcripts, or
meetings. Labrador changes that workflow. A team can open one shared session, see who is
present, comment on direction, edit prompts, watch AI output stream live, and preserve
versions of important work.

Every session includes permissioned roles, shareable links, anonymous viewer counts, and
durable history. Admins can grant view, comment, or edit access. Stakeholders can open a
link from desktop or mobile and contribute at the right level without derailing the work.

Labrador is built for speed. The web app runs on Vercel, the realtime room service runs
as a Rust WebSocket backend on Railway, and durable authority lives in Postgres. The
architecture keeps presence and streaming instant while keeping IAM, audit, and history
server-authoritative.

The result is AI work that teams can actually share while it is happening.

## FAQ

### What is Labrador?

Labrador is a realtime multiplayer prompting tool. It lets teams collaborate inside
shared AI sessions with prompts, comments, versions, branches, permissions, share links,
and streamed AI runs.

### Who is it for?

It is for teams using AI to produce real work: founders, operators, product teams,
engineering teams, marketing teams, and stakeholders reviewing AI-assisted work.

### What makes it different from ChatGPT, Claude, or Codex?

Those tools are primarily single-player or workflow-specific. Labrador's core primitive
is the shared session. Multiple people can view, comment, edit, and watch AI work in
realtime with permission controls.

### Why not just use Google Docs with pasted AI output?

Google Docs is strong for collaborative documents, but it is not designed around live AI
runs, prompt versions, agent state, tool execution, or run fanout. Labrador starts from
the AI workflow and adds document-grade collaboration.

### Why not just use Slack threads?

Slack is good for conversation but weak for canonical prompt state, versions, branches,
permissions, and realtime AI output. Labrador keeps the work itself in one shared place.

### What is the core object?

The core object is a session. A session contains prompt drafts, messages, AI runs,
comments, files, artifacts, versions, branches, members, and share links.

### How does sharing work?

Admins and owners can create share links. Links grant scoped access such as viewer or
commenter. Links MUST be revocable and MUST NOT store raw tokens.

### Can anonymous users participate?

Yes, but only through valid share links. Anonymous users SHOULD default to viewing. They
MAY comment or edit only if the link explicitly grants that capability.

### How does Labrador stay fast?

High-frequency collaboration uses the Rust WebSocket service and in-memory room state.
Durable authority uses Postgres. Presence, typing, and token fanout MUST NOT wait on a
database write.

### Why Rust for realtime?

The realtime server has a narrow, performance-critical job: WebSocket rooms, presence,
fanout, backpressure, and reconnect behavior. Rust gives speed, predictable resource use,
and a strong concurrency model for that boundary.

### Why Next.js on Vercel?

The frontend needs shareable URLs, auth surfaces, API routes, server-rendered shells, and
fast deployment. Next.js App Router on Vercel is the fastest path for that product layer.

### What must be true before a real launch?

Before launch, Labrador MUST have a working shared session, safe IAM, share links,
presence, comment flow, AI run streaming, mobile view, CI/CD, and deployable Vercel and
Railway services.

### What is the product's sharpest risk?

The biggest risk is building a nice AI chat UI without true multiplayer authority. The
product only works if collaboration, permissions, and realtime state are foundational.

