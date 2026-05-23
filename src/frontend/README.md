# Labrador Frontend

This is the Vercel-hosted Next.js App Router frontend for Labrador.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run check
```

## Runtime

- Node.js: 24.x
- Framework: Next.js App Router
- Styling: Tailwind CSS
- Deployment: Vercel project `labrador-frontend`

## Boundaries

The frontend owns the product shell, permission-aware UI, share pages, and ordinary HTTP
API calls. It MUST NOT own WebSocket room authority, durable IAM, or realtime fanout.
Those responsibilities belong to the Rust realtime service and Postgres-backed APIs
described in `../../brain/`.

## Deployment

The Vercel project is connected to `alexnicita/labrador` with root directory
`src/frontend`. Pushes to `main` can deploy through Vercel Git integration once the
project is enabled for production deployments.
