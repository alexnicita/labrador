# Collaboration And Permissions

Labrador sessions are shared by default. Collaboration, permissions, realtime state, and
AI runs are foundational product behavior.

## Core Primitive

A `session` is the primary collaboration room. It owns prompt drafts, messages, runs,
comments, versions, branches, files, artifacts, memberships, and share grants.

People may join a session through direct membership or a share link. Anonymous viewers
are allowed only through explicit share-link grants.

## Presence

Presence is ephemeral connection state. It may include connection id, user id, anonymous
marker, display name, effective role summary, focus, selection, typing state, and last
seen timestamp.

Presence is not durable membership. Active counts must come from live connections, not
database membership rows.

Authenticated collaborators may appear as visible participants when permitted. Anonymous
viewers should be counted in aggregate, such as "12 anonymous viewers", without inventing
identities.

## Roles

Labrador v1 uses these roles:

| Role | Meaning |
| --- | --- |
| `owner` | Ultimate control over a workspace or session. |
| `admin` | Can manage members, permissions, and share links for the scoped resource. |
| `editor` | Can edit prompts and create AI work inside the session. |
| `commenter` | Can view and comment, but cannot edit prompts or start privileged runs by default. |
| `viewer` | Can view permitted session content. |
| `anonymous_viewer` | Can view through a share link without account identity. |

Roles are convenience bundles. Server-side checks should evaluate capabilities.

## Core Capabilities

| Capability | Purpose |
| --- | --- |
| `session.view` | View permitted session content and join the realtime room. |
| `session.comment` | Create comments or other low-risk feedback. |
| `session.edit_prompt` | Edit the prompt draft. |
| `run.start` | Start an AI run. |
| `run.cancel_own` | Cancel a run started by the same actor. |
| `run.cancel_any` | Cancel any active run in scope. |
| `session.share` | Create, update, or revoke share links. |
| `members.manage` | Manage membership. |
| `permissions.change` | Change roles or capabilities. |
| `session.delete` | Delete or archive a session when supported. |

Mutating HTTP handlers, WebSocket events, run actions, share-link changes, file access,
membership updates, and durable writes must enforce capabilities on the server.

## Share Links

A share link is a scoped grant. It should include:

- Durable id.
- Resource scope and resource id.
- Granted role or capability set.
- Secret token shown only in the URL.
- Stored token hash, never the raw token.
- Creator id and creation timestamp.
- Optional expiration and revocation timestamp.
- Optional authenticated-user requirement.

Share links should default to viewer or commenter access. Anonymous editor links are high
risk and require explicit owner or admin intent if supported.

Revoked links must stop working for HTTP access and WebSocket joins.

## Realtime Event Rules

Realtime events should be explicit, compact, and versionable. Event names use dotted
lowercase namespaces such as `room.*`, `presence.*`, `draft.*`, `comment.*`, `run.*`,
`message.*`, `member.*`, `share.*`, and `version.*`.

Comments, run starts, run cancellations, membership changes, and share-link changes
should commit through trusted HTTP APIs first. After the durable mutation commits, the
backend publishes events such as `comment.created`, `run.status`, `member.changed`, or
`share.changed` to the realtime service.

## Reconnect And Resync

Clients must handle WebSocket disconnects. On reconnect, a client should reauthenticate,
rejoin the session room, send its last seen room sequence when available, and accept a
missed-event replay or `room.resync_required` directive.

Disconnected editors may keep local draft input temporarily, but privileged mutations
must wait for reconnection and authorization.

## AI Runs

Runs are shared session work. A run should record who started it, which session and input
prompt/version it used, current status, streamed output or output references, and failure
or cancellation details.

Run output visible to multiple collaborators should fan out through the realtime service
and persist as durable chunks or final outputs. The system should batch output into
readable chunks rather than broadcasting one event per model token.
