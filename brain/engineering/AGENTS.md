# Agent Operating Guide

This document tells coding agents how to work inside Labrador. It is not public product
copy. It is an implementation contract.

## Mission

Agents writing Labrador code MUST preserve the product thesis: realtime collaborative AI
work where prompts, comments, versions, permissions, and agent runs are shared by default
inside a controlled session.

Agents MUST optimize for:

- Clear ownership between frontend, realtime, persistence, and AI execution.
- Small v1 systems that can scale without a rewrite.
- Server-enforced permissions.
- Instant local interaction with eventual durable persistence.
- Consistent terminology from `GLOSSARY.md`.

## Default Workflow

For every non-trivial change, agents SHOULD follow this sequence:

1. Read the relevant brain docs.
2. Inspect existing code and tests before deciding.
3. Identify the subsystem boundary: web, realtime, data, AI, security, or design.
4. Make the smallest coherent change that satisfies the request.
5. Verify the path that matters most to users.
6. Explain what changed and any remaining risk.

Agents MUST NOT invent new product primitives when existing Labrador terms fit. For
example, use `session`, `run`, `share link`, `membership`, `presence`, and `artifact`
as defined in `GLOSSARY.md`.

## Authority Rules

The brain docs are normative. When a request conflicts with these docs, agents SHOULD
surface the conflict and choose the safer implementation unless the user explicitly
updates the product direction.

Implementation-critical docs:

- `ARCHITECTURE.md` governs runtime boundaries.
- `SECURITY.md` governs roles, capabilities, share links, and anonymous access.
- `../operations/SPEED.md` governs realtime hot-path behavior.
- `PROTOCOL.md` governs event names and wire shape.
- `DATA.md` governs durable ownership and persistence.
- `../operations/OPERATING_MODE.md` governs deadline execution discipline.

## Codebase Behavior

Agents MUST:

- Keep frontend code separate from realtime server code.
- Keep shared protocol types centralized once packages exist.
- Generate or validate Rust and TypeScript protocol types from one schema source.
- Avoid duplicating permission logic across clients.
- Treat client-side checks as hints, never authority.
- Prefer additive schema changes while the product is moving quickly.
- Keep realtime messages compact, typed, and versionable.
- Batch noisy events instead of broadcasting unbounded streams.

Agents MUST NOT:

- Store presence heartbeats, cursor movement, or every keystroke as durable database rows.
- Put the whole application state into a generic CRDT.
- Make Vercel Functions act as a WebSocket room server.
- Trust share-link tokens in plaintext storage.
- Let anonymous users create high-impact side effects without explicit capability checks.
- Hide AI run failures from collaborators.

## Documentation Behavior

When changing a product primitive, agents SHOULD update the relevant brain document in
the same change. Documentation should be direct and operational:

- Use MUST, SHOULD, MAY, and MUST NOT.
- Describe system behavior, not aspirations.
- Cross-link the canonical doc instead of repeating long rules.
- Keep examples short and implementation-shaped.

## Testing Behavior

Agents MUST choose tests based on blast radius:

- IAM changes require authorization tests.
- Realtime changes require reconnect, ordering, or fanout checks.
- AI streaming changes require cancellation and multi-viewer behavior checks.
- UI changes require desktop and mobile viewport review.

See `../operations/TESTING.md` for the acceptance mindset.
