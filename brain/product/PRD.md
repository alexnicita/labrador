# Labrador PRD

## Product Summary

Labrador is a realtime multiplayer prompting workspace for teams. It combines Codex-like
AI work sessions with Google Docs-style collaboration: shared prompts, visible presence,
comments, versions, branches, share links, and permissioned AI runs.

The product MUST help teams do AI work together instead of copying prompts, sharing
screens, or pasting outputs into documents after the fact.

## Customer Problem

AI work is increasingly collaborative, but the tools are mostly single-player. Teams lose
context when one person prompts privately, shares a transcript, and asks others to review
after the work is done.

The current workflow creates four failures:

- Context loss: collaborators cannot see the active prompt, files, assumptions, or run state.
- Slow feedback: comments arrive after the AI direction is already stale.
- Weak control: links, permissions, and run ownership are informal.
- Poor accountability: it is hard to know who changed direction, started a run, or approved output.

Labrador MUST turn AI work into a shared, permissioned, realtime session.

## Target Users

Primary users:

- Founders and operators using AI to create strategy, plans, and documents.
- Product, marketing, and engineering teams collaborating on prompt-driven work.
- Technical teams using AI agents to research, write, code, and review.

Secondary users:

- Executives or stakeholders who open share links to view and comment.
- Anonymous viewers who need low-friction access without becoming full users.

## V1 User Promise

A user can create a session, invite collaborators or share a link, draft a prompt with
others, start an AI run, watch output stream in realtime, collect comments, and preserve
versions or branches of the work.

The first deployable product MUST prove:

- Shared session UI.
- Permission-aware access states.
- Realtime-ready frontend structure.
- Rust WebSocket backend foundation.
- Durable IAM/data model foundation.
- Fast deployment path through Vercel and Railway.

## Core V1 Capabilities

### Shared Sessions

Sessions MUST be the primary product container. A session owns prompt drafts, messages,
runs, comments, versions, branches, files, artifacts, memberships, and share links.

### Multiplayer Presence

The product MUST distinguish named collaborators from anonymous viewers. Presence SHOULD
feel immediate and MUST NOT depend on durable database writes.

### Prompt Collaboration

Editors SHOULD be able to shape prompts together. V1 MAY start with a simple draft model,
but the architecture MUST preserve a path to richer concurrent editing.

### AI Runs

AI runs MUST be visible to permitted collaborators. Starting and cancelling runs MUST be
permissioned. Output SHOULD stream through the realtime system for all connected viewers.

### Comments

Commenters and editors MUST be able to leave durable feedback. Comments SHOULD attach to
stable targets such as sessions, runs, messages, prompt versions, or artifacts.

### Versions And Branches

Versions MUST help teams understand how the prompt or output changed. Branches SHOULD let
teams explore alternate AI directions without losing the original work.

### Share Links

Share links MUST be easy, viral, permissioned, and revocable. Anonymous access SHOULD
default to viewer or commenter capability.

### IAM

Roles and capabilities MUST be server-enforced. UI affordances are not security.

### Mobile Compatibility

Mobile users MUST be able to open a shared session, understand status, view output, and
comment when permitted.

## Non-Goals For V1

V1 MUST NOT attempt to build:

- A generic design canvas.
- A full enterprise admin suite.
- Multi-region realtime infrastructure.
- A complete CRDT system for all app state.
- A marketplace of agents.
- A full analytics warehouse.

V1 SHOULD leave room for these later without overbuilding now.

## Success Metrics

Product success SHOULD be evaluated by:

- Time from new repo clone to deployed frontend and backend.
- Time from session open to understanding current AI work.
- Share-link opens per created session.
- Comment rate per shared session.
- Percent of runs watched by more than one participant.
- Reconnect success rate for realtime sessions.
- Median time for AI run status to reach collaborators.

## Quality Bar

Labrador MUST feel fast, trustworthy, and useful before it feels feature-complete.

Agents MUST prioritize:

- Correct service boundaries.
- Security and IAM clarity.
- Realtime responsiveness.
- Mobile readability.
- Clear implementation names.
- Fast CI/CD and deployment.

