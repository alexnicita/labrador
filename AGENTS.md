# Labrador Agent Entrypoint

This file is the first document every coding agent MUST read before changing Labrador.
Labrador is a realtime multiplayer prompting product: Codex-like AI work sessions with
Google Docs-style collaboration, permissions, sharing, comments, versioning, and mobile
compatibility.

## Required Reading Order

Agents MUST read these files before making architecture, product, security, protocol, or
data-model decisions:

1. `brain/README.md`
2. `brain/engineering/AGENTS.md`
3. `brain/product/PRD.md`
4. `brain/product/PRFAQ.md`
5. `brain/product/MANIFESTO.md`
6. `brain/product/PHILOSOPHY.md`
7. `brain/product/PRODUCT.md`
8. `brain/engineering/ARCHITECTURE.md`
9. `brain/engineering/SECURITY.md`
10. `brain/operations/SPEED.md`
11. `brain/engineering/PROTOCOL.md`
12. `brain/engineering/DATA.md`
13. `brain/engineering/COLLABORATION.md`
14. `brain/design/DESIGN.md`
15. `brain/design/REFERENCE.md`
16. `brain/engineering/AI.md`
17. `brain/operations/OPERATING_MODE.md`
18. `brain/operations/TESTING.md`
19. `brain/operations/CI_CD.md`
20. `brain/engineering/GLOSSARY.md`

For small code changes, agents MAY read only the directly relevant brain documents, but
they MUST read `brain/engineering/SECURITY.md`, `brain/operations/SPEED.md`,
`brain/engineering/PROTOCOL.md`, and `brain/engineering/DATA.md` before changing
permissions, realtime behavior, event payloads, or durable storage.

## Non-Negotiable Product Shape

Labrador MUST feel like shared AI work, not private chat with collaboration bolted on.
The core unit is a shared session where multiple people can view, comment, edit prompts,
start or watch AI runs, inspect versions, and branch from prior work.

The v1 platform direction is:

- Next.js on Vercel for the web app, routing, UI, auth surfaces, and ordinary HTTP APIs.
- Rust realtime service on Railway for WebSocket rooms, presence, live editing, viewer
  counts, and run fanout.
- Neon/Postgres for durable authority: users, workspaces, sessions, IAM, share links,
  messages, comments, runs, versions, and audit records.
- Optional Redis only when realtime must scale past one process or one region.

Agents MUST NOT replace this architecture casually. Any change to the split between
Vercel, Railway, Rust, and Neon MUST be justified against
`brain/engineering/ARCHITECTURE.md`.

## Engineering Defaults

- Ship simple, specify deeply.
- Keep the hot realtime path out of the database.
- Treat IAM as a server-enforced capability system, not a UI affordance.
- Make anonymous sharing easy but bounded.
- Prefer explicit events over magical shared state.
- Keep agent run output observable, cancellable, and attributable.
- Optimize for mobile from the first implementation, not as a later breakpoint pass.

## Before Editing

Before editing code or docs, agents SHOULD:

- Inspect the current repo state.
- Identify which brain files govern the change.
- Avoid overwriting user work or unrelated local changes.
- Preserve established names unless a brain document defines a better canonical term.
- Add or update tests when behavior changes.

## Done Means

A change is not done until:

- It honors the relevant brain docs.
- Permission boundaries are enforced server-side.
- Realtime behavior has a reconnection or resync story when applicable.
- Durable data writes have a clear owner and schema.
- Mobile and narrow viewport behavior is considered for user-facing UI.
- Tests or explicit verification cover the meaningful risk.
