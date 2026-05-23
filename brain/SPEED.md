# Speed And Realtime Performance

This document defines how Labrador stays fast. Agents MUST apply these rules when
building realtime, AI streaming, persistence, and mobile UI.

## Latency Targets

V1 SHOULD aim for:

- Local typing feedback: immediate.
- Presence join/leave visibility: under 250 ms when connected.
- Live prompt patch fanout: under 150 ms inside the same region under normal load.
- Comment create confirmation: under 500 ms.
- AI run status change visibility: under 250 ms after the backend knows.
- AI streamed output fanout: batched every 40 to 150 ms, not per token.

These are product targets, not hard service-level guarantees.

## Hot Path Rules

The hot path is WebSocket memory plus compact events.

Agents MUST NOT put these on the durable write path:

- Cursor movement.
- Presence heartbeat.
- Typing indicator changes.
- Every keystroke.
- Every individual model token.

Agents SHOULD persist:

- Meaningful prompt versions.
- Messages and comments.
- Run lifecycle events.
- Batched run output chunks.
- Artifacts.
- Membership and permission changes.

## Optimistic Interaction

The client SHOULD apply local state before server round trips for low-risk actions:

- Draft edits.
- Composer typing.
- Opening side panels.
- Local pending comments.
- Reactions, when they can be reconciled.

The server MUST still acknowledge or reject meaningful mutations. Rejections MUST result
in clear UI correction.

## Batching

Agents SHOULD batch noisy streams:

- AI tokens into small text chunks.
- Presence heartbeat updates into connection state.
- Rapid prompt edits into compact patches.
- Run trace writes into periodic durable chunks.

Batching MUST NOT make the UI feel frozen. Prefer small frequent batches over large slow
flushes.

## Reconnect And Resume

The client MUST handle WebSocket disconnects.

On reconnect, the client SHOULD:

1. Re-authenticate with its current grant.
2. Rejoin the session room.
3. Send last seen room sequence or state version if available.
4. Receive missed durable state or a resync directive.
5. Rebuild presence from the server snapshot.

The realtime service SHOULD use monotonically increasing room sequence numbers for
events that clients may need to order or detect gaps.

## Persistence Boundaries

Durable writes SHOULD happen outside the tight realtime loop whenever possible.

Examples:

- Live prompt patches are realtime first; snapshots or versions are debounced.
- AI run deltas are broadcast in batches; durable chunks are stored separately.
- Presence is in memory; analytics may sample join/leave events later.

Postgres MUST remain the authority for durable data, but it MUST NOT be the transport for
high-frequency collaboration.

## Mobile Performance

Mobile clients SHOULD receive the same semantic data with less visual noise.

Agents MUST:

- Avoid layout shift during streaming output.
- Keep comments and run status responsive on narrow screens.
- Avoid unbounded DOM growth for long AI streams.
- Virtualize or collapse long histories when needed.
- Preserve tap target quality during realtime updates.

## Backpressure

Realtime services MUST have a backpressure policy:

- Slow clients SHOULD be dropped or degraded before they slow the room.
- Outbound queues SHOULD be bounded.
- Large payloads SHOULD be replaced by references to durable records or blobs.
- AI output SHOULD be chunked and resumable through durable state.

## Performance Anti-Patterns

Agents MUST NOT:

- Broadcast full session snapshots for every small change.
- Store entire room state in React component trees when an external store is needed.
- Re-render all session content for every presence event.
- Send one WebSocket message per model token.
- Use polling as the primary collaboration mechanism.
- Require a database read before every harmless presence update.

