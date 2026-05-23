# Labrador Manifesto

Labrador exists because AI work is becoming team work.

Single-player chat is not enough for planning, writing, coding, researching, reviewing,
and deciding with AI. Teams need a shared place where people and agents can work in the
same context at the same time, with the same artifact, the same history, and the same
permission boundary.

Labrador is Codex plus Google Docs for prompting and agentic work.

## What Labrador Is

Labrador is a realtime collaboration environment for AI sessions. A session is a shared
workspace where people can:

- Draft and refine prompts together.
- Comment on AI direction and outputs.
- Watch agent runs as they happen.
- Branch from prior versions or runs.
- Share a session through controlled links.
- Invite collaborators with view, comment, edit, or admin permissions.
- Preserve the history needed to understand how work changed.

Labrador MUST make collaborative AI feel native, not like a screen share, copied prompt,
or exported transcript.

## What Labrador Is Not

Labrador is not:

- A private chatbot with multiplayer decoration.
- A generic document editor.
- A design canvas.
- A dashboard of disconnected agent logs.
- An analytics product pretending to be collaboration software.

The product MAY contain documents, files, branches, and artifacts, but the core surface is
shared AI work.

## Product Promises

Labrador MUST deliver five promises:

1. Shared context: collaborators see the same session, run state, comments, and versions.
2. Instant presence: people should feel who is there without waiting for a database write.
3. Permissioned control: every meaningful action is governed by server-side IAM.
4. Shareability: links make collaboration easy without making data careless.
5. Accountability: AI actions, human comments, and permission changes leave a trace.

## V1 Bet

The v1 bet is that teams want to co-create prompts and AI outputs with the same immediacy
they expect from modern collaborative docs.

V1 MUST prioritize:

- Realtime session presence.
- Shared prompt editing.
- Commenting and reactions.
- Permissioned AI runs.
- Version history.
- Share links.
- Mobile-compatible viewing and commenting.

V1 SHOULD avoid large abstractions that only serve speculative enterprise scale. The
system should be simple, explicit, and ready to evolve.

## Success Standard

Labrador is working when a teammate can open a link on a phone, understand the AI work in
progress, comment on the direction, watch the run continue, and trust that their access
level is exactly what the session owner intended.

