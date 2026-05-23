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

## Environment

Required for the public demo:

- `DATABASE_URL`: Neon/Postgres connection string for durable demo messages,
  comments, reactions, and AI usage reservations.
- `OPENAI_API_KEY`: OpenAI API key. Keep this only in Vercel or a local ignored
  `.env.local`; never commit it.
- `REALTIME_AUTH_JWT_SECRET`: shared secret used to mint realtime room JWTs.

Required for tips:

- `STRIPE_TIP_PRICE_100`, `STRIPE_TIP_PRICE_500`, and `STRIPE_TIP_PRICE_2000`:
  one-time USD Stripe Price ids for the `$1`, `$5`, and `$20` tip buttons.
- `STRIPE_TIP_LINK_100`, `STRIPE_TIP_LINK_500`, and `STRIPE_TIP_LINK_2000`:
  Stripe Payment Link URLs used as the live fallback when no server Stripe key is
  configured.

Optional:

- `OPENAI_MODEL`: defaults to `gpt-5.4-mini`.
- `OPENAI_MAX_OUTPUT_TOKENS`: defaults to `800`.
- `OPENAI_TIMEOUT_MS`: defaults to `45000`.
- `NIMBLE_API_KEY`: enables the AI SDK `webSearch` tool. When missing, Labrador
  still answers without live web search.
- `NIMBLE_TIMEOUT_MS`: defaults to `12000`.
- `NIMBLE_INCLUDE_ANSWER=1`: opts into Nimble's generated answer field when the
  account supports it. By default Labrador uses source results only.
- `CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`,
  `CLICKHOUSE_DATABASE`, and `CLICKHOUSE_USAGE_TABLE`: enable best-effort usage
  analytics. ClickHouse failures never block the demo room.
- `CLICKHOUSE_REQUEST_TIMEOUT_MS`: defaults to `5000`.
- `NEXT_PUBLIC_REALTIME_DEMO_ENABLED=1` and `NEXT_PUBLIC_REALTIME_WS_URL`: enable
  browser WebSocket joins for live presence and fanout.
- `REALTIME_SERVICE_URL` and `REALTIME_PUBLISH_SECRET`: let the Next.js API publish
  committed events into the Rust realtime service.
- `STRIPE_SECRET_KEY`: server-only Stripe key for API-created Checkout Sessions.
- `STRIPE_WEBHOOK_SECRET`: webhook signing secret for `/api/stripe/webhook`.
- `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET`: server-only CDP credentials for the
  x402 facilitator.
- `X402_FACILITATOR_URL`: defaults to
  `https://api.cdp.coinbase.com/platform/v2/x402`.
- `X402_NETWORK`: defaults to `eip155:8453` for Base mainnet.

## Boundaries

The frontend owns the product shell, permission-aware UI, share pages, and ordinary HTTP
API calls. It MUST NOT own WebSocket room authority, durable IAM, or realtime fanout.
Those responsibilities belong to the Rust realtime service and Postgres-backed APIs
described in `../../brain/`.

## Deployment

The Vercel project is connected to `alexnicita/labrador` with root directory
`src/frontend`. Pushes to `main` can deploy through Vercel Git integration once the
project is enabled for production deployments.
