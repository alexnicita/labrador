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
`session.edit_prompt` before accepting `draft.patch`.

## Railway

Create a Railway service from this monorepo and set:

- Root directory: `src/backend`
- Config path: `/src/backend/railway.toml`
- Variables: `REALTIME_AUTH_JWT_SECRET`, `ALLOWED_ORIGINS`, and optional `RUST_LOG`

Do not commit real secrets. Git should contain placeholders and deployment config only;
Railway variables or a secret manager should contain secret values.

## GitHub Actions Deploy

The production deploy workflow uses the `Production` GitHub Environment and expects:

- Environment secret: `RAILWAY_TOKEN`
- Environment variables: `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`,
  `RAILWAY_ENVIRONMENT_NAME`

Use a Railway project token for `RAILWAY_TOKEN`, not a personal account token. Project
tokens are scoped to one Railway project environment and are the right fit for CI/CD.
