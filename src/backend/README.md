# Labrador Realtime

Rust WebSocket service for Labrador session rooms. It is intended to run as the Railway
realtime service while the Next.js app remains on Vercel.

## Local Development

```sh
cp .env.example .env
cargo run
```

Health check:

```sh
curl http://localhost:4001/health
```

With `LABRADOR_DEV_AUTH_BYPASS=true`, a local client can connect to:

```txt
ws://localhost:4001/ws/dev-session
```

Production WebSocket connections must pass a short-lived realtime JWT as `?token=...`.
The token is minted by trusted server code, signed with `REALTIME_AUTH_JWT_SECRET`, and
contains:

```json
{
  "sub": "user_123",
  "sessionId": "session_123",
  "capabilities": ["session.view", "session.edit_prompt"],
  "displayName": "Ada",
  "role": "editor",
  "anonymous": false,
  "exp": 1779552000
}
```

The realtime service verifies `session.view` before joining a room and
`session.edit_prompt` before accepting `draft.patch`. Reactions use
`reaction.toggle` and require `session.comment`.

Clients can reconnect with `?lastSeq=<seq>` to receive replayed ordered room events when
the event is still in the room replay buffer. If the buffer no longer covers the gap, the
server sends `room.resync_required`.

## Durable Fanout

Messages, comments, runs, versions, membership, and share-link changes should commit
through the trusted HTTP/API layer first. After the durable mutation commits, trusted
server code can fan it out to connected collaborators:

```sh
curl -X POST http://localhost:4001/internal/rooms/dev-session/events \
  -H "authorization: Bearer $REALTIME_PUBLISH_SECRET" \
  -H "content-type: application/json" \
  -d '{"type":"comment.created","actorId":"user_123","payload":{"commentId":"comment_1","body":"hello"}}'
```

Supported internal event types include `message.created`, `comment.created`,
`reaction.updated`, `run.started`, `run.delta`, `run.status`, `member.changed`,
`share.changed`, and `version.created`.

The older `/rooms/{roomId}/publish` route remains as an alias for local compatibility.

## Scaling And Backpressure

The server keeps hot room state in memory and uses bounded fanout queues so slow clients
cannot stall a room. Important knobs:

- `MAX_CONNECTIONS` and `MAX_ROOM_CONNECTIONS`
- `ROOM_BROADCAST_CAPACITY` and `ROOM_REPLAY_CAPACITY`
- `OUTBOUND_QUEUE_CAPACITY`
- `MAX_WS_MESSAGE_BYTES` and `MAX_EVENT_PAYLOAD_BYTES`
- `PRESENCE_EVENTS_PER_SECOND` / `PRESENCE_BURST`
- `MUTATION_EVENTS_PER_SECOND` / `MUTATION_BURST`
- `PING_INTERVAL_SECS`

For more than one Railway realtime replica, add Redis pub/sub or an equivalent shared
ephemeral bus so room members on different processes receive the same events.

## Railway

Create a Railway service from this monorepo and set:

- Root directory: `src/backend`
- Config path: `/src/backend/railway.toml`
- Variables: `REALTIME_AUTH_JWT_SECRET`, `ALLOWED_ORIGINS`, optional
  `REALTIME_PUBLISH_SECRET`, and optional `RUST_LOG`

Do not commit real secrets. Git should contain placeholders and deployment config only;
Railway variables or a secret manager should contain secret values.

## GitHub Actions Deploy

The production deploy workflow uses the `Production` GitHub Environment and expects:

- Environment secret: `RAILWAY_TOKEN`
- Environment variables: `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`,
  `RAILWAY_ENVIRONMENT_NAME`

Use a Railway project token for `RAILWAY_TOKEN`, not a personal account token. Project
tokens are scoped to one Railway project environment and are the right fit for CI/CD.
