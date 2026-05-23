# Architecture

This document defines Labrador's v1 system architecture. Agents MUST treat this as the
default architecture unless the user explicitly changes it.

## System Topology

Labrador v1 uses a split runtime:

- Next.js on Vercel: web app, route rendering, auth UI, ordinary HTTP APIs, simple LLM
  gateway endpoints, upload endpoints, and share-page routing.
- Rust realtime service on Railway: WebSocket rooms, presence, live prompt patches,
  viewer counts, typing state, and AI run fanout.
- Neon/Postgres: durable authority for users, workspaces, sessions, memberships,
  share links, messages, comments, runs, versions, files, artifacts, and audit events.
- Optional Redis: cross-replica pub/sub and ephemeral coordination once the Railway
  realtime service scales beyond one process.
- Vercel Blob or equivalent object storage: uploaded files, large artifacts, generated
  files, and downloadable outputs.

Vercel Functions MUST NOT be used as the WebSocket room server. They MAY stream a single
HTTP response for the initiating user, but shared realtime fanout belongs to the Railway
service.

## Intended Monorepo Shape

When code is scaffolded, the repository SHOULD evolve toward:

```txt
apps/web          Next.js application deployed on Vercel
apps/realtime     Rust WebSocket service deployed on Railway
packages/protocol shared event schemas and generated Rust/TypeScript types
packages/db       schema, migrations, and typed persistence helpers
packages/auth     capability checks and IAM helpers
packages/ai       LLM adapters and run orchestration helpers
brain/            normative agent documentation
tests/            integration and behavior tests
```

Existing folders MAY be adapted into this shape, but agents SHOULD preserve the runtime
separation.

Protocol schemas SHOULD have one source of truth that can generate or validate both
Rust and TypeScript shapes. V1 SHOULD prefer JSON Schema or another language-neutral
schema format for WebSocket and HTTP payloads. Rust types MUST derive `serde`
serialization/deserialization, and TypeScript clients MUST consume generated or validated
types from the same schema source. Agents MUST NOT hand-maintain divergent Rust and
TypeScript event payload definitions.

## Runtime Responsibilities

### Next.js Web App

The web app owns:

- Rendering session UI.
- Managing client state and optimistic interactions.
- Calling HTTP APIs for durable mutations.
- Authenticating users.
- Opening WebSocket connections to the realtime service.
- Displaying reconnect, stale, loading, and permission states.

The web app MUST NOT be the source of truth for permissions, membership, share links, or
durable run state.

### Rust Realtime Service

The realtime service owns:

- WebSocket connection lifecycle.
- Room join and leave.
- Presence state.
- Anonymous and visible viewer counts.
- Low-latency broadcast of live prompt patches.
- Typing and selection state.
- AI run delta fanout.
- Reconnect resume windows where feasible.

The realtime service SHOULD keep hot-path state in memory. It MUST call or cache server
authority for access checks before letting a connection join a room or perform privileged
events.

### Neon/Postgres

Postgres owns durable authority:

- Identity mappings.
- Workspaces and sessions.
- Memberships and roles.
- Share-link grants and revocations.
- Messages, comments, prompt versions, run records, files, artifacts, and audit events.

Postgres MUST NOT receive every cursor movement, heartbeat, token, or keystroke. See
`../operations/SPEED.md`.

### AI Execution

V1 MAY start with LLM calls from Vercel route handlers when runs are short and simple.
If runs become long, tool-heavy, cancellable, or retryable, execution SHOULD move to a
Railway worker while Vercel remains the run-start gateway.

All run output visible to multiple users MUST be published to the realtime service and
persisted in durable chunks or final outputs.

## Core Data Flows

### Session Open

1. Browser loads the session through Next.js.
2. Server-rendered or API-loaded data includes durable session metadata and the user's
   effective role.
3. Browser opens a WebSocket to Railway with an authenticated session token or anonymous
   share-link grant.
4. Realtime service validates join capability.
5. Realtime service emits presence and current ephemeral room state.

### Share Link Open

1. Browser opens a share URL.
2. Next.js resolves the token without exposing raw token storage.
3. The server computes the effective anonymous or authenticated role.
4. The UI renders the allowed surface.
5. WebSocket join uses the effective grant and receives only allowed realtime events.

### AI Run Start

1. Client asks Next.js API to start a run.
2. API checks `run.start` capability.
3. API creates a durable run record.
4. Runner streams status and deltas to the realtime service.
5. Realtime service broadcasts batched run deltas to connected collaborators.
6. Durable run output and status are persisted.

### Live Prompt Edit

1. Client applies a local optimistic edit.
2. Client sends compact patch events through WebSocket.
3. Realtime service validates edit capability and broadcasts to room.
4. Client or server snapshots are debounced into durable prompt versions.

## Scaling Rules

V1 SHOULD start with one realtime process in the same broad region as the database.

Add Redis when:

- More than one realtime replica is required.
- Railway routing cannot guarantee all room members hit the same process.
- AI workers need to publish deltas to rooms across processes.

Add analytics storage later when product analytics or run traces outgrow Postgres. Do not
add ClickHouse for v1 transactional authority.

## Architectural Anti-Patterns

Agents MUST NOT:

- Put WebSocket rooms in Vercel Functions.
- Persist high-frequency presence events as primary data.
- Make Postgres the fanout path for live typing or token streaming.
- Use a generic CRDT for sessions, comments, permissions, and runs.
- Let the client compute effective permissions without server confirmation.
- Introduce multi-region writes before the product has a concrete need.
