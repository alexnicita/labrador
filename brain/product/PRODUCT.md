# Product Model

This document defines Labrador's v1 product primitives. Agents MUST use these concepts
when naming models, routes, APIs, events, and UI.

## Core Product

Labrador is a shared AI session product. The core experience is:

1. A user creates or opens a session.
2. Collaborators join through membership or share links.
3. People draft prompts, comment, and start AI runs.
4. AI output streams into the shared session.
5. The team keeps, branches, or revises the result.

## Workspace

A workspace is a container for people and sessions. It SHOULD own:

- Members.
- Billing or limits later.
- Default permissions later.
- Session list.

V1 MAY keep workspaces simple, but agents SHOULD avoid building session ownership in a
way that prevents workspace-level administration later.

## Session

A session is the primary collaboration room. It owns:

- Title.
- Current prompt draft or active prompt state.
- Messages and AI outputs.
- Comments.
- Runs.
- Versions.
- Branches.
- Files and artifacts.
- Membership and share grants.

Sessions MUST have stable ids. Share URLs SHOULD resolve to sessions.

## Prompt Draft

A prompt draft is the editable instruction or request that collaborators shape before or
during an AI run.

Prompt drafts SHOULD support live collaboration. The implementation MAY use text CRDTs or
patch events for concurrent editing, but the durable product model MUST preserve prompt
versions that explain meaningful changes.

## Run

A run is one execution of AI work. It MUST have:

- Starter actor.
- Session id.
- Input prompt/version reference.
- Status.
- Timestamps.
- Streamed output or output references.
- Failure/cancellation information when relevant.

Runs SHOULD be visible to every collaborator with `session.view` unless permissions later
introduce hidden runs.

## Message

A message is a durable conversational or AI output unit. Messages SHOULD be ordered and
attributed to a human, anonymous actor, or AI actor.

Messages are not the only product object. Comments, versions, runs, files, and artifacts
MUST NOT be forced awkwardly into messages if a dedicated primitive is clearer.

## Comment

A comment is human feedback anchored to a stable target:

- Session.
- Prompt version.
- Message.
- Run.
- Artifact.

Comments MUST be permissioned by `session.comment` or a more specific future capability.

## Version

A version is a durable checkpoint of meaningful prompt or artifact state. Versions SHOULD
make it possible to review, restore, or branch from earlier work.

Versions SHOULD be created intentionally or through debounced meaningful snapshots, not on
every keystroke.

## Branch

A branch is an alternate direction from an existing session, prompt version, run, or
artifact. V1 MAY implement branches lightly, but the product language SHOULD reserve
branch for alternate AI work, not UI tabs.

## File

A file is uploaded context or source material. Files SHOULD have access rules inherited
from the session unless a stricter model is introduced.

## Artifact

An artifact is a generated or user-curated output that can be inspected, downloaded,
versioned, or referenced by later runs.

Artifacts SHOULD be separate from transient run deltas.

## Viewer

A viewer is an active connection with `session.view`. Viewers may be:

- Visible authenticated users.
- Anonymous viewers counted as aggregate.

The product MUST distinguish visible viewer identity from anonymous viewer count.

