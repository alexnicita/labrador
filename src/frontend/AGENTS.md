<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Labrador Frontend Rules

Before changing this frontend, agents MUST read `../../AGENTS.md` and the relevant files
in `../../brain/`.

This app is the Vercel-hosted Labrador web surface. It MUST stay aligned with:

- `../../brain/engineering/ARCHITECTURE.md` for the Next.js/Vercel boundary.
- `../../brain/design/DESIGN.md` for the shared-session UI shape.
- `../../brain/engineering/SECURITY.md` for permission-aware UI and server authority.
- `../../brain/operations/SPEED.md` for realtime and mobile performance constraints.

The frontend MUST NOT own WebSocket room authority, durable IAM, or realtime fanout.
Those belong to the Rust realtime service and Postgres-backed APIs described in `brain/`.
