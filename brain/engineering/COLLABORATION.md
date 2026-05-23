# Collaboration

This document defines multiplayer behavior for Labrador sessions.

## Collaboration Model

Labrador sessions are shared by default. Any implementation of session UI, realtime
events, comments, prompt editing, runs, or sharing MUST assume multiple participants can
be present.

## Presence

Presence is ephemeral connection state. It SHOULD include:

- Connection id.
- User id when authenticated.
- Anonymous marker when unauthenticated.
- Display name or initials for visible users.
- Role or effective permission summary when useful.
- Current focus, selection, or typing state when appropriate.
- Last seen timestamp for server cleanup.

Presence MUST NOT be the durable source of membership. Membership lives in Postgres.

## Visible And Anonymous Viewers

Authenticated collaborators SHOULD appear as visible participants if permitted by the
current viewer's access level.

Anonymous viewers SHOULD be counted as an aggregate. The UI MAY show "23 anonymous
viewers" but MUST NOT invent identities for them.

The realtime service MUST compute active counts from live connections, not from durable
membership records.

## Live Prompt Editing

Live prompt editing SHOULD feel instant. The client SHOULD apply local changes before
server confirmation and reconcile with authoritative room state.

The implementation MAY use:

- Text CRDT updates for rich concurrent prompt editing.
- Server-authoritative patch events for simpler draft editing.

Agents MUST NOT use a whole-session CRDT for comments, runs, permissions, files, and
share links. Those are explicit server-authoritative product events.

## Comments

Comments are durable collaboration. They MUST be persisted and authorized.

Comment creation SHOULD broadcast a realtime event after durable acceptance so all viewers
see it without polling. The UI MAY optimistically display a pending comment but MUST
handle rejection.

## AI Run Fanout

When an AI run streams output, every permitted collaborator in the session SHOULD see:

- Run started.
- Run status changes.
- Batched output deltas.
- Tool or step state when exposed.
- Completion, failure, or cancellation.

Only authorized actors MAY start or cancel runs. Viewers MAY watch runs.

## Ordering

Realtime events that affect shared state SHOULD include a room sequence number or a
resource version. Clients SHOULD detect gaps and request resync.

Presence events MAY be best-effort and do not need durable ordering.

## Conflict Behavior

For v1:

- Prompt text conflicts SHOULD be handled by the chosen collaborative editing mechanism.
- Comments are append-oriented and SHOULD avoid conflict.
- Permission changes are server-authoritative and MUST take effect on subsequent checks.
- Run state is server-authoritative and SHOULD reject impossible transitions.

When a conflict cannot be merged safely, the UI SHOULD preserve the user's local input and
ask for reconciliation rather than silently discarding it.

## Reactions And Lightweight Feedback

Reactions MAY be optimistic and reconciled after server acceptance. Anonymous reactions
SHOULD be rate limited if allowed.

## Disconnection

Disconnected clients MUST show a state that tells the user collaboration is degraded.
Editors SHOULD be able to keep local draft input temporarily, but privileged mutations
MUST wait for reconnection and authorization.

