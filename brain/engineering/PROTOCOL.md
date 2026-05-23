# Protocol

This document defines Labrador's v1 realtime and HTTP protocol expectations. Agents MUST
keep event names and payload concepts stable once code exists.

## Protocol Principles

- Events MUST be explicit.
- Event names MUST use dotted lowercase namespaces.
- Payloads MUST be compact and versionable.
- Mutating events MUST be authorized.
- Clients MUST be able to detect stale state for shared resources.
- Realtime events SHOULD describe what happened, not expose internal implementation.

## Naming

Use these namespaces:

- `room.*` for connection, join, leave, sync, and errors.
- `presence.*` for ephemeral users, cursor, selection, focus, and typing state.
- `draft.*` for live prompt editing.
- `comment.*` for comments.
- `run.*` for AI run lifecycle and deltas.
- `message.*` for durable message creation or updates.
- `member.*` for membership changes.
- `share.*` for share-link changes.
- `version.*` for prompt or artifact versions.

## Envelope

Realtime messages SHOULD use a consistent envelope:

```ts
type RealtimeEnvelope<TPayload> = {
  type: string
  roomId: string
  eventId: string
  seq?: number
  actorId?: string
  sentAt: string
  payload: TPayload
}
```

`seq` SHOULD be present for ordered room events. Presence-only events MAY omit it.

## Client To Realtime Events

Core client events:

```ts
type ClientEvent =
  | { type: "room.join"; payload: JoinPayload }
  | { type: "presence.update"; payload: PresenceUpdatePayload }
  | { type: "draft.patch"; payload: DraftPatchPayload }
```

Run starts SHOULD go through HTTP first so durable authorization and run creation happen
before fanout.

Comments and run cancellations SHOULD also go through HTTP first because they are durable
mutations with permission checks, audit implications, and user-visible acknowledgement.
After the HTTP mutation commits, the backend SHOULD publish `comment.created` or
`run.status` to the realtime service for room fanout. A future implementation MAY allow
WebSocket-first durable mutations, but only if the realtime service performs the same
authorization, persistence, audit, and acknowledgement guarantees as the HTTP path.

## Server To Client Events

Core server events:

```ts
type ServerEvent =
  | { type: "room.joined"; payload: RoomJoinedPayload }
  | { type: "room.resync_required"; payload: ResyncRequiredPayload }
  | { type: "room.error"; payload: RoomErrorPayload }
  | { type: "presence.snapshot"; payload: PresenceSnapshotPayload }
  | { type: "presence.update"; payload: PresenceUpdatePayload }
  | { type: "draft.patch"; payload: DraftPatchPayload }
  | { type: "comment.created"; payload: CommentCreatedPayload }
  | { type: "run.started"; payload: RunStartedPayload }
  | { type: "run.delta"; payload: RunDeltaPayload }
  | { type: "run.status"; payload: RunStatusPayload }
  | { type: "message.created"; payload: MessageCreatedPayload }
  | { type: "member.changed"; payload: MemberChangedPayload }
  | { type: "share.changed"; payload: ShareChangedPayload }
  | { type: "version.created"; payload: VersionCreatedPayload }
```

## HTTP Boundaries

HTTP APIs SHOULD own durable mutations:

- Create session.
- Update session title.
- Create or update membership.
- Create, update, or revoke share link.
- Start AI run.
- Cancel AI run.
- Create comment.
- Upload files.
- Fetch snapshots, comments, messages, runs, and versions.

WebSocket events SHOULD own low-latency collaboration and fanout:

- Presence.
- Typing.
- Live draft patches.
- Run deltas.
- Room resync notifications.

## Acknowledgements

Mutating realtime events SHOULD receive an acknowledgement when the client needs to know
whether the server accepted the change.

Acknowledgements SHOULD include:

- Client event id.
- Accepted or rejected status.
- Error code when rejected.
- Authoritative resource version when relevant.

## Error Codes

Use stable error codes, not only human messages:

- `unauthenticated`
- `permission_denied`
- `room_not_found`
- `share_link_revoked`
- `payload_invalid`
- `rate_limited`
- `stale_version`
- `resync_required`
- `server_error`

## Versioning

Protocol changes SHOULD be additive in v1. Breaking changes MUST update both client and
server in the same change and document the migration if deployed.

Messages SHOULD include enough metadata for future protocol versioning without requiring
a full redesign.

## Payload Constraints

Realtime payloads MUST NOT include:

- Raw share-link tokens.
- Provider API keys or model credentials.
- Full large artifacts.
- Full session snapshots except explicit resync payloads.
- Hidden membership details not visible to the recipient.

Large outputs SHOULD be chunked or represented by durable references.
