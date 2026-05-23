# Getting Started

This guide covers the basic local workflow for Labrador contributors.

## Prerequisites

- Node.js 24.x for the frontend.
- npm for frontend dependencies.
- Rust 1.88 or the version selected by `src/backend/rust-toolchain.toml`.
- Git and GitHub CLI when publishing changes.
- Local environment variables for services you intend to run.

Do not commit real secrets. Keep local values in ignored `.env` files or platform secret
stores.

## Repository Layout

```txt
src/frontend   Next.js App Router web app
src/backend    Rust realtime WebSocket service
brain          Canonical product and engineering rules
docs           Basic contributor and operator docs
tests          Integration and behavior test placeholders
```

## Frontend

```bash
cd src/frontend
npm install
npm run dev
```

The frontend runs the product shell, permission-aware UI, share pages, and HTTP API
surfaces. It must not own durable IAM or WebSocket room authority.

Useful commands:

```bash
npm run lint
npm run typecheck
npm run build
npm run check
```

Environment variables are documented in
[`src/frontend/README.md`](../src/frontend/README.md). The common local values include
`DATABASE_URL`, `OPENAI_API_KEY`, `REALTIME_AUTH_JWT_SECRET`,
`NEXT_PUBLIC_REALTIME_WS_URL`, `REALTIME_SERVICE_URL`, and
`REALTIME_PUBLISH_SECRET`.

## Realtime Backend

```bash
cd src/backend
cp .env.example .env
cargo run
```

Health check:

```bash
curl http://localhost:4001/health
```

With `LABRADOR_DEV_AUTH_BYPASS=true`, a local client can connect to:

```txt
ws://localhost:4001/ws/dev-session
```

Production WebSocket connections must use a short-lived realtime JWT minted by trusted
server code. The realtime service verifies `session.view` before room join and checks
mutating capabilities such as `session.edit_prompt` before accepting events.

Useful commands:

```bash
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build --release
```

## Before Changing Code Or Docs

1. Read [`AGENTS.md`](../AGENTS.md).
2. Read the brain documents that govern the change.
3. Inspect current worktree state with `git status --short --branch`.
4. Keep changes scoped to the requested behavior.
5. Run the relevant checks before pushing when practical.

For docs-only changes, at minimum run:

```bash
git diff --check
```

## Naming Rules

Use the canonical Labrador terms from
[`brain/engineering/GLOSSARY.md`](../brain/engineering/GLOSSARY.md): `session`, `run`,
`share link`, `membership`, `presence`, `prompt draft`, `prompt version`, `artifact`,
`workspace`, `role`, and `capability`.
