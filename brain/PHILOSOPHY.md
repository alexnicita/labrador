# Labrador Philosophy

This document defines the principles agents MUST apply when implementation details are
not fully specified elsewhere.

## Collaboration Is The Primitive

Labrador MUST treat collaboration as a foundational state, not an add-on. The app should
assume that every session may have multiple viewers, commenters, editors, and admins.

Implications:

- Session state MUST be shareable.
- AI run state MUST be visible to permitted collaborators.
- Comments and versions MUST be first-class, not metadata afterthoughts.
- Presence MUST be lightweight and immediate.

## Authority Lives On The Server

The client MAY predict, preview, and optimistically render. The server MUST decide.

Permissions, run starts, run cancellation, share-link creation, membership updates, and
durable writes MUST be authorized server-side. UI visibility is not access control.

## Realtime Is A Feeling And A Protocol

Users experience realtime as confidence: "other people are here, the AI is working, and
my actions landed."

The implementation MUST support that feeling through:

- Optimistic local UI.
- Compact WebSocket events.
- Explicit acknowledgements for meaningful mutations.
- Reconnect and resync behavior.
- Clear stale, failed, and disconnected states.

## Data Should Explain Work

Labrador's history should answer:

- Who had access?
- Who changed the prompt?
- What did the AI do?
- Which output became the accepted direction?
- What comments or approvals shaped the result?

Durable data SHOULD preserve decisions, not every transient gesture.

## Simple Systems Win V1

The first implementation SHOULD prefer direct service boundaries:

- Next.js for the web product.
- Rust on Railway for realtime rooms.
- Neon/Postgres for authority and durable records.
- Optional Redis when fanout across realtime replicas is required.

Agents MUST NOT add Kafka, ClickHouse, multi-region routing, or a generic event-sourcing
platform unless the user explicitly asks or production evidence requires it.

## AI Must Be Legible

An AI run MUST be inspectable by collaborators. The product should show what the AI is
doing, who started it, whether it can be cancelled, what it produced, and what state it
is in now.

Agent work SHOULD be streamed, attributed, and recoverable. Silent background magic is a
bad default for shared work.

## Sharing Should Be Easy And Bounded

Share links are a growth surface and a security surface. Labrador MUST make links easy
to create and easy to revoke. Anonymous access SHOULD default to lower-risk capabilities.

## Mobile Is Not Secondary

Mobile users MUST be able to open a session, understand status, view output, see comments,
and contribute at their permission level. Complex editing MAY be more capable on desktop,
but mobile cannot be read-only by accident unless the role requires it.

