# Architecture

Labrador v1 uses a split runtime so shared AI work feels realtime while durable
authority stays explicit and auditable.

## Services

| Service | Location | Owner |
| --- | --- | --- |
| Web app | `src/frontend` | Next.js on Vercel |
| Realtime service | `src/backend` | Rust WebSocket service on Railway |
| Durable data | Neon/Postgres | users, workspaces, sessions, IAM, messages, comments, runs, versions, files, artifacts, audit records |
| Object storage | Vercel Blob or equivalent | uploaded files, generated files, large artifacts |
| Optional ephemeral bus | Redis or equivalent | cross-replica pub/sub when realtime scales past one process |

Vercel Functions must not be used as the WebSocket room server. Shared fanout belongs to
the Rust realtime service.

## Frontend Responsibilities

The Next.js app owns:

- Session UI and routing.
- Auth surfaces and share-page rendering.
- Permission-aware controls and optimistic client state.
- HTTP calls for durable mutations.
- WebSocket connection management.
- Reconnect, stale, loading, and permission states.

The frontend is not the source of truth for permissions, membership, share links, or run
state.

## Realtime Responsibilities

The Rust service owns:

- WebSocket connection lifecycle.
- Room join and leave.
- Presence and aggregate anonymous viewer counts.
- Live prompt patch fanout.
- Typing, focus, and selection state when implemented.
- AI run status and output fanout.
- Reconnect replay windows or resync directives.
- Backpressure for slow clients.

The realtime hot path should stay in memory. It must validate join authority before a
socket enters a room and must check capabilities before accepting mutating events.

## Durable Data Responsibilities

Postgres owns durable authority:

- Users, workspaces, and memberships.
- Sessions and share links.
- Messages, comments, prompt versions, branches, runs, files, artifacts, and tips.
- Audit events for meaningful permission, sharing, run, and destructive actions.

Postgres must not receive every cursor movement, heartbeat, keystroke, or individual
model token.

## Core Flows

### Session Open

1. Browser loads a session through Next.js.
2. Server-loaded data includes session metadata and effective role.
3. Browser opens a WebSocket to the realtime service.
4. Realtime service validates `session.view`.
5. Realtime service emits room state and presence.

### Share Link Open

1. Browser opens a share URL.
2. Next.js resolves the token without storing or exposing raw token values.
3. Server computes the effective grant.
4. UI renders only the allowed surface.
5. WebSocket join uses the effective grant.

### AI Run Start

1. Client calls a trusted HTTP API to start a run.
2. API checks `run.start`.
3. API creates the durable run record.
4. Runner streams status and output deltas to the realtime service.
5. Realtime service broadcasts batched deltas.
6. Durable chunks or final output are persisted.

### Live Prompt Edit

1. Client applies a local optimistic edit.
2. Client sends compact `draft.patch` events through WebSocket.
3. Realtime service checks `session.edit_prompt` and broadcasts accepted patches.
4. Meaningful snapshots become durable prompt versions.

## Directional Monorepo Shape

The current repo uses `src/frontend` and `src/backend`. As Labrador grows, the intended
shape is:

```txt
apps/web
apps/realtime
packages/protocol
packages/db
packages/auth
packages/ai
brain
tests
```

Protocol schemas should have one source of truth that can generate or validate both Rust
and TypeScript shapes.

## Anti-Patterns

Do not:

- Put WebSocket rooms in Vercel Functions.
- Use Postgres as the transport for live typing, presence, or token fanout.
- Store raw share-link tokens.
- Let clients compute effective permissions without server confirmation.
- Add multi-region writes, analytics warehouses, or generic event sourcing before the
  product has a concrete need.
