# Data Model

This document defines durable data ownership. It does not replace future schema files,
but agents MUST follow these boundaries when creating tables, migrations, APIs, and tests.

## Source Of Truth

Neon/Postgres is the v1 source of truth for durable Labrador state.

The realtime service owns ephemeral room state only. The client owns temporary local UI
state only. Neither replaces durable Postgres authority.

## Durable Entities

V1 SHOULD model these durable entities:

- `users`
- `workspaces`
- `workspace_members`
- `sessions`
- `session_members`
- `share_links`
- `messages`
- `comments`
- `prompt_versions`
- `branches`
- `agent_runs`
- `run_events` or durable run chunks
- `files`
- `artifacts`
- `audit_events`

Agents MAY combine or defer low-traffic entities during early scaffolding, but MUST NOT
blur IAM, share-link, and run-state authority.

## Identity

Users represent authenticated people. Anonymous viewers SHOULD be represented in events
as anonymous principals tied to a connection, share link, or browser/session identifier,
not as fake users.

## Membership

Membership tables own durable access for authenticated users. Membership SHOULD record:

- Resource scope.
- User id.
- Role.
- Created by.
- Created timestamp.
- Updated timestamp.
- Removed or revoked timestamp if soft deletion is used.

Permission checks SHOULD derive capabilities from membership plus share-link grants.
Grant precedence MUST follow `SECURITY.md`.

## Share Links

Share links own anonymous or invite-style access. Store token hashes, never raw tokens.

Share-link records SHOULD include:

- Id.
- Resource scope and id.
- Token hash.
- Granted role or capability set.
- Whether auth is required.
- Creator id.
- Created timestamp.
- Optional expiration.
- Optional revoked timestamp.

## Sessions

Sessions own collaboration state and should reference:

- Workspace.
- Title.
- Created actor.
- Current canonical prompt/version where applicable.
- Lifecycle state if archived or deleted.

Session deletion SHOULD be soft or guarded until data retention rules are explicit.

## Messages And Comments

Messages are durable conversation or AI output units.

Comments are durable feedback anchored to a target. A comment target SHOULD be stable:

- Session id.
- Message id.
- Run id.
- Prompt version id.
- Artifact id.

Comments SHOULD NOT depend on fragile text offsets unless a robust anchoring model is
implemented.

## Prompt Versions

Prompt versions should store meaningful checkpoints. They SHOULD include:

- Session id.
- Author or system actor.
- Content or content reference.
- Parent version when applicable.
- Created timestamp.
- Summary or label when available.

Prompt versions MUST NOT be created for every keystroke.

## Agent Runs

Agent runs should store:

- Run id.
- Session id.
- Starter actor.
- Input prompt/version reference.
- Model/provider metadata safe for users.
- Status.
- Started, finished, failed, or cancelled timestamps.
- Error classification when failed.

Run deltas MAY be stored as chunks or events. Full final output SHOULD be recoverable
without replaying an unbounded stream.

## Files And Artifacts

Files represent uploaded context. Artifacts represent generated or curated outputs.

Large binary data SHOULD live in object storage. Postgres SHOULD store metadata,
ownership, access scope, content type, size, checksum when useful, and blob reference.

## Audit Events

Audit events SHOULD be append-only. They SHOULD record actor, action, target, timestamp,
and relevant metadata.

Audit events are not the realtime transport. They exist for accountability.

## Data Anti-Patterns

Agents MUST NOT:

- Store share-link raw tokens.
- Use presence as membership.
- Depend on client role claims without server verification.
- Store unbounded token streams as one row per token.
- Treat comments, versions, and runs as generic JSON blobs if typed columns are needed
  for permissions or product queries.
