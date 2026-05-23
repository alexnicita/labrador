import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

export type TipRail = "stripe_checkout" | "stripe_x402";
export type TipStatus = "created" | "pending" | "paid" | "failed" | "cancelled";

type TipDbRow = {
  id: string;
  amount_cents: number | string;
  currency: string;
  rail: TipRail;
  status: TipStatus;
  session_id: string | null;
  note: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  x402_network: string | null;
  x402_deposit_address: string | null;
  x402_payment_identifier: string | null;
  receipt_metadata: Record<string, unknown>;
  created_at: Date | string;
  updated_at: Date | string;
  paid_at: Date | string | null;
};

export type TipRecord = {
  id: string;
  amountCents: number;
  currency: string;
  rail: TipRail;
  status: TipStatus;
  sessionId: string | null;
  note: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  x402Network: string | null;
  x402DepositAddress: string | null;
  x402PaymentIdentifier: string | null;
  receiptMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
};

let sqlClient: ReturnType<typeof neon> | null = null;
let tableReady = false;

function getSql() {
  if (!sqlClient) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured");
    }

    sqlClient = neon(databaseUrl);
  }

  return sqlClient;
}

function mapTip(row: TipDbRow): TipRecord {
  return {
    id: row.id,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    rail: row.rail,
    status: row.status,
    sessionId: row.session_id,
    note: row.note,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    x402Network: row.x402_network,
    x402DepositAddress: row.x402_deposit_address,
    x402PaymentIdentifier: row.x402_payment_identifier,
    receiptMetadata: row.receipt_metadata ?? {},
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
  };
}

export function sanitizeTipNote(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

  return cleaned || null;
}

export function sanitizeTipToken(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);

  return cleaned || null;
}

export async function ensureTipsTable() {
  if (tableReady) {
    return;
  }

  const sql = getSql();

  await sql`
    create table if not exists labrador_tips (
      id text primary key,
      amount_cents integer not null check (amount_cents > 0),
      currency text not null default 'usd',
      rail text not null check (rail in ('stripe_checkout', 'stripe_x402')),
      status text not null check (status in ('created', 'pending', 'paid', 'failed', 'cancelled')),
      session_id text,
      note text,
      stripe_checkout_session_id text,
      stripe_payment_intent_id text,
      x402_network text,
      x402_deposit_address text,
      x402_payment_identifier text,
      receipt_metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      paid_at timestamptz
    )
  `;
  await sql`
    create index if not exists labrador_tips_created_idx
      on labrador_tips (created_at desc)
  `;
  await sql`
    create index if not exists labrador_tips_status_created_idx
      on labrador_tips (status, created_at desc)
  `;
  await sql`
    create unique index if not exists labrador_tips_checkout_session_idx
      on labrador_tips (stripe_checkout_session_id)
      where stripe_checkout_session_id is not null
  `;
  await sql`
    create unique index if not exists labrador_tips_payment_intent_idx
      on labrador_tips (stripe_payment_intent_id)
      where stripe_payment_intent_id is not null
  `;
  await sql`
    create unique index if not exists labrador_tips_x402_deposit_idx
      on labrador_tips (x402_network, lower(x402_deposit_address))
      where x402_deposit_address is not null
  `;
  await sql`
    create unique index if not exists labrador_tips_x402_payment_identifier_idx
      on labrador_tips (x402_payment_identifier)
      where x402_payment_identifier is not null
  `;

  tableReady = true;
}

export async function createCheckoutTipRecord({
  amountCents,
  note,
  sessionId,
}: {
  amountCents: number;
  note?: unknown;
  sessionId?: unknown;
}) {
  await ensureTipsTable();

  const sql = getSql();
  const [row] = (await sql`
    insert into labrador_tips (
      id,
      amount_cents,
      rail,
      status,
      session_id,
      note
    )
    values (
      ${randomUUID()},
      ${amountCents},
      'stripe_checkout',
      'created',
      ${sanitizeTipToken(sessionId)},
      ${sanitizeTipNote(note)}
    )
    returning *
  `) as TipDbRow[];

  return mapTip(row);
}

export async function attachCheckoutSessionToTip({
  tipId,
  checkoutSessionId,
  paymentIntentId,
}: {
  tipId: string;
  checkoutSessionId: string;
  paymentIntentId?: string | null;
}) {
  await ensureTipsTable();

  const sql = getSql();
  const [row] = (await sql`
    update labrador_tips
    set
      stripe_checkout_session_id = ${checkoutSessionId},
      stripe_payment_intent_id = coalesce(${paymentIntentId ?? null}, stripe_payment_intent_id),
      updated_at = now()
    where id = ${tipId}
    returning *
  `) as TipDbRow[];

  return row ? mapTip(row) : null;
}

export async function createX402TipRecord({
  amountCents,
  network,
  depositAddress,
  stripePaymentIntentId,
  paymentIdentifier,
  supportedTokens,
  note,
  sessionId,
}: {
  amountCents: number;
  network: string;
  depositAddress: string;
  stripePaymentIntentId: string;
  paymentIdentifier?: string | null;
  supportedTokens?: unknown;
  note?: unknown;
  sessionId?: unknown;
}) {
  await ensureTipsTable();

  const receiptMetadata = JSON.stringify({
    provider: "stripe",
    stripePaymentIntentId,
    supportedTokens: Array.isArray(supportedTokens) ? supportedTokens : [],
  });
  const sql = getSql();
  const [row] = (await sql`
    insert into labrador_tips (
      id,
      amount_cents,
      rail,
      status,
      session_id,
      note,
      stripe_payment_intent_id,
      x402_network,
      x402_deposit_address,
      x402_payment_identifier,
      receipt_metadata
    )
    values (
      ${randomUUID()},
      ${amountCents},
      'stripe_x402',
      'pending',
      ${sanitizeTipToken(sessionId)},
      ${sanitizeTipNote(note)},
      ${stripePaymentIntentId},
      ${network},
      ${depositAddress},
      ${sanitizeTipToken(paymentIdentifier)},
      ${receiptMetadata}::jsonb
    )
    returning *
  `) as TipDbRow[];

  return mapTip(row);
}

export async function findX402TipByDepositAddress({
  network,
  depositAddress,
}: {
  network: string;
  depositAddress: string;
}) {
  await ensureTipsTable();

  const sql = getSql();
  const [row] = (await sql`
    select *
    from labrador_tips
    where rail = 'stripe_x402'
      and x402_network = ${network}
      and lower(x402_deposit_address) = lower(${depositAddress})
    limit 1
  `) as TipDbRow[];

  return row ? mapTip(row) : null;
}

export async function markX402TipVerified({
  network,
  depositAddress,
  paymentIdentifier,
  receiptMetadata,
}: {
  network: string;
  depositAddress: string;
  paymentIdentifier?: string | null;
  receiptMetadata?: Record<string, unknown>;
}) {
  await ensureTipsTable();

  const metadata = JSON.stringify(receiptMetadata ?? {});
  const safePaymentIdentifier = sanitizeTipToken(paymentIdentifier);
  const paymentIdentifierValue = safePaymentIdentifier ?? "";
  const sql = getSql();
  const [row] = (await sql`
    update labrador_tips
    set
      x402_payment_identifier = case
        when ${paymentIdentifierValue} = '' then x402_payment_identifier
        when x402_payment_identifier is not null then x402_payment_identifier
        when exists (
          select 1
          from labrador_tips existing
          where existing.x402_payment_identifier = ${paymentIdentifierValue}
            and existing.id <> labrador_tips.id
        ) then x402_payment_identifier
        else ${paymentIdentifierValue}
      end,
      receipt_metadata = receipt_metadata || ${metadata}::jsonb,
      updated_at = now()
    where rail = 'stripe_x402'
      and x402_network = ${network}
      and lower(x402_deposit_address) = lower(${depositAddress})
    returning *
  `) as TipDbRow[];

  return row ? mapTip(row) : null;
}

export async function markTipPaid({
  tipId,
  checkoutSessionId,
  paymentIntentId,
  receiptMetadata,
}: {
  tipId?: string | null;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  receiptMetadata?: Record<string, unknown>;
}) {
  await ensureTipsTable();

  const metadata = JSON.stringify(receiptMetadata ?? {});
  const safeTipId = tipId ?? "";
  const safeCheckoutSessionId = checkoutSessionId ?? "";
  const safePaymentIntentId = paymentIntentId ?? "";
  const sql = getSql();
  const [row] = (await sql`
    update labrador_tips
    set
      status = 'paid',
      stripe_checkout_session_id = coalesce(stripe_checkout_session_id, ${checkoutSessionId ?? null}),
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id, ${paymentIntentId ?? null}),
      receipt_metadata = receipt_metadata || ${metadata}::jsonb,
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
    where
      (${Boolean(tipId)} and id = ${safeTipId})
      or (${Boolean(checkoutSessionId)} and stripe_checkout_session_id = ${safeCheckoutSessionId})
      or (${Boolean(paymentIntentId)} and stripe_payment_intent_id = ${safePaymentIntentId})
    returning *
  `) as TipDbRow[];

  return row ? mapTip(row) : null;
}

export async function markTipFailed({
  checkoutSessionId,
  paymentIntentId,
  status,
  receiptMetadata,
}: {
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  status: Extract<TipStatus, "failed" | "cancelled">;
  receiptMetadata?: Record<string, unknown>;
}) {
  await ensureTipsTable();

  const metadata = JSON.stringify(receiptMetadata ?? {});
  const safeCheckoutSessionId = checkoutSessionId ?? "";
  const safePaymentIntentId = paymentIntentId ?? "";
  const sql = getSql();
  const [row] = (await sql`
    update labrador_tips
    set
      status = ${status},
      receipt_metadata = receipt_metadata || ${metadata}::jsonb,
      updated_at = now()
    where
      (${Boolean(checkoutSessionId)} and stripe_checkout_session_id = ${safeCheckoutSessionId})
      or (${Boolean(paymentIntentId)} and stripe_payment_intent_id = ${safePaymentIntentId})
    returning *
  `) as TipDbRow[];

  return row ? mapTip(row) : null;
}
