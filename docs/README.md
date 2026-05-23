# Labrador Docs

Labrador is a realtime multiplayer prompting product: Codex-like AI work sessions with
Google Docs-style collaboration, permissions, sharing, comments, versioning, and mobile
compatibility.

These docs give contributors and operators the basic public map of the project. The
canonical implementation rules live in [`brain/`](../brain/README.md). Read
[`AGENTS.md`](../AGENTS.md) and the relevant brain documents before changing product
primitives, architecture, permissions, realtime behavior, protocol events, or durable
storage.

## Doc Map

- [Getting started](./getting-started.md): local setup, commands, and verification.
- [Architecture](./architecture.md): service boundaries and core data flows.
- [Collaboration and permissions](./collaboration-and-permissions.md): sessions,
  presence, roles, capabilities, share links, and realtime rules.
- [Deployment](./deployment.md): Vercel, Railway, CI, and secret handling.

## Product Shape

The core unit is a shared `session`. A session owns prompt drafts, messages, AI runs,
comments, versions, branches, files, artifacts, memberships, and share links.

Labrador must feel like shared AI work, not private chat with collaboration added later.
Multiple people should be able to view, comment, edit prompts, start or watch runs,
inspect versions, and branch from prior work with server-enforced permissions.

## Runtime Summary

- `src/frontend`: Next.js App Router app deployed on Vercel.
- `src/backend`: Rust WebSocket realtime service deployed on Railway.
- `brain`: normative product and engineering instructions for agents.
- `docs`: contributor and operator documentation.

## Canonical References

- Product model: [`brain/product/PRODUCT.md`](../brain/product/PRODUCT.md)
- Architecture: [`brain/engineering/ARCHITECTURE.md`](../brain/engineering/ARCHITECTURE.md)
- Security and IAM: [`brain/engineering/SECURITY.md`](../brain/engineering/SECURITY.md)
- Protocol: [`brain/engineering/PROTOCOL.md`](../brain/engineering/PROTOCOL.md)
- Data model: [`brain/engineering/DATA.md`](../brain/engineering/DATA.md)
- Testing: [`brain/operations/TESTING.md`](../brain/operations/TESTING.md)
