# Deployment

Labrador deploys as a split system: the web app runs on Vercel, and the realtime
WebSocket service runs on Railway. Durable authority lives in Neon/Postgres.

## Frontend On Vercel

The frontend project uses:

- Root directory: `src/frontend`
- Runtime: Node.js 24.x
- Framework: Next.js App Router
- Check command: `npm run check`

Important environment variables are documented in
[`src/frontend/README.md`](../src/frontend/README.md). Server-only secrets such as
`DATABASE_URL`, `OPENAI_API_KEY`, `REALTIME_AUTH_JWT_SECRET`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `CDP_API_KEY_ID`, and `CDP_API_KEY_SECRET` must stay in Vercel
or local ignored files.

Browser-exposed values must use the `NEXT_PUBLIC_` prefix only when the value is safe for
the client bundle.

## Realtime Backend On Railway

The backend project uses:

- Root directory: `src/backend`
- Config path: `/src/backend/railway.toml`
- Health check: `GET /health`

Required Railway variables:

- `REALTIME_AUTH_JWT_SECRET`
- `ALLOWED_ORIGINS`

Common optional variables:

- `REALTIME_PUBLISH_SECRET`
- `RUST_LOG`
- capacity, rate-limit, and WebSocket tuning values documented in
  [`src/backend/README.md`](../src/backend/README.md)

Do not commit real Railway variables or service tokens.

## GitHub Actions

Frontend CI runs lint, typecheck, and build for changes under `src/frontend`.

Backend CI runs:

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test --locked
```

The backend deploy workflow uses the `Production` GitHub Environment and expects:

- Secret: `RAILWAY_TOKEN`
- Variables: `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`, `RAILWAY_ENVIRONMENT_NAME`

Use a Railway project token for `RAILWAY_TOKEN`, not a personal account token.

## Deployment Discipline

Before pushing deployable changes:

1. Verify the worktree state.
2. Run the relevant local checks.
3. Confirm secrets are not included in the diff.
4. Push a coherent branch or merge to the intended branch.
5. Watch CI and deployment status when the change can affect production.

Docs-only changes should at least pass:

```bash
git diff --check
```

## Production Boundaries

- Vercel may render routes, serve HTTP APIs, and initiate short AI requests.
- Shared realtime fanout belongs to the Railway service.
- Postgres is the durable authority for sessions, memberships, share links, comments,
  messages, runs, versions, artifacts, and audit events.
- Presence, heartbeats, cursor movement, live typing, and individual model tokens should
  not be persisted as durable rows.
