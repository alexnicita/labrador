import { createFacilitatorConfig } from "@coinbase/x402";
import { HTTPFacilitatorClient } from "@x402/core/server";
import {
  decodePaymentSignatureHeader,
  type HTTPRequestContext,
} from "@x402/core/http";
import type { Network, PaymentPayload } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
} from "@x402/extensions/bazaar";
import {
  declarePaymentIdentifierExtension,
  extractPaymentIdentifier,
  PAYMENT_IDENTIFIER,
  paymentIdentifierResourceServerExtension,
} from "@x402/extensions/payment-identifier";
import { withX402, x402ResourceServer, type RouteConfig } from "@x402/next";
import { NextRequest, NextResponse } from "next/server";

import { checkDemoRateLimit } from "@/lib/demo-feed/rate-limit";
import {
  formatX402UsdPrice,
  getX402FacilitatorUrl,
  getX402Network,
  isX402Configured,
  isX402TipAmount,
  X402_TIP_AMOUNTS_CENTS,
} from "@/lib/tips/config";
import {
  createX402TipRecord,
  ensureTipsTable,
  findX402TipByDepositAddress,
  markTipFailed,
  markTipPaid,
  markX402TipVerified,
  sanitizeTipNote,
  sanitizeTipToken,
} from "@/lib/tips/db";
import { getRequestActorKey } from "@/lib/tips/request";
import { createStripeCryptoDepositPaymentIntent } from "@/lib/tips/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProtectedPost = (request: NextRequest) => Promise<NextResponse<unknown>>;

let resourceServer: x402ResourceServer | null = null;
let protectedPost: ProtectedPost | null = null;

function parseTipAmountFromPath(path: string) {
  const amountCents = Number(path.split("/").filter(Boolean).at(-1));

  if (!Number.isInteger(amountCents) || !isX402TipAmount(amountCents)) {
    throw new Error("Unsupported x402 tip amount.");
  }

  return amountCents;
}

function getQueryParam(context: HTTPRequestContext, name: string) {
  const value = context.adapter.getQueryParam?.(name);

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getPaymentHeader(request: Request) {
  return (
    request.headers.get("payment-signature") ||
    request.headers.get("PAYMENT-SIGNATURE")
  );
}

function decodePaymentHeader(paymentHeader: string | null | undefined) {
  if (!paymentHeader) {
    return null;
  }

  try {
    return decodePaymentSignatureHeader(paymentHeader);
  } catch {
    return null;
  }
}

function getPayToFromPaymentPayload(paymentPayload: PaymentPayload | null) {
  const authorization = paymentPayload?.payload?.authorization;
  const authorizedPayTo =
    authorization &&
    typeof authorization === "object" &&
    "to" in authorization &&
    typeof authorization.to === "string"
      ? authorization.to
      : null;

  return authorizedPayTo || paymentPayload?.accepted?.payTo || null;
}

async function createPayToAddress(context: HTTPRequestContext) {
  const amountCents = parseTipAmountFromPath(context.path);
  const network = getX402Network();
  const paymentPayload = decodePaymentHeader(context.paymentHeader);
  const headerPayTo = getPayToFromPaymentPayload(paymentPayload);

  if (headerPayTo) {
    const existingTip = await findX402TipByDepositAddress({
      network,
      depositAddress: headerPayTo,
    });

    if (!existingTip || existingTip.amountCents !== amountCents) {
      throw new Error("Invalid x402 payTo address.");
    }

    return headerPayTo;
  }

  await ensureTipsTable();

  const sessionId = sanitizeTipToken(getQueryParam(context, "sessionId"));
  const note = sanitizeTipNote(getQueryParam(context, "note"));
  const { paymentIntent, depositAddress, supportedTokens } =
    await createStripeCryptoDepositPaymentIntent({
      amountCents,
      metadata: {
        source: "labrador_tip",
        rail: "stripe_x402",
        amountCents: String(amountCents),
        x402Network: network,
      },
    });

  await createX402TipRecord({
    amountCents,
    network,
    depositAddress,
    stripePaymentIntentId: paymentIntent.id,
    supportedTokens,
    note,
    sessionId,
  });

  return depositAddress;
}

function getRouteConfig() {
  return {
    accepts: {
      scheme: "exact",
      price: (context) => formatX402UsdPrice(parseTipAmountFromPath(context.path)),
      network: getX402Network() as Network,
      payTo: createPayToAddress,
      maxTimeoutSeconds: 300,
    },
    description:
      "Send a voluntary tip to Labrador. Tips do not grant permissions or paid access.",
    mimeType: "application/json",
    unpaidResponseBody: (context) => {
      const amountCents = parseTipAmountFromPath(context.path);

      return {
        contentType: "application/json",
        body: {
          error: "payment_required",
          message:
            "Retry this request with an x402 payment signature to send a voluntary tip.",
          amountCents,
          currency: "usd",
          rail: "stripe_x402",
          network: getX402Network(),
          supportedAmountsCents: X402_TIP_AMOUNTS_CENTS,
          paymentIdentifier: {
            supported: true,
            required: false,
          },
        },
      };
    },
    extensions: {
      ...declareDiscoveryExtension({
        bodyType: "json",
        input: {
          note: "optional short note",
          sessionId: "optional Labrador session id",
        },
        inputSchema: {
          properties: {
            note: { type: "string", maxLength: 240 },
            sessionId: { type: "string", maxLength: 96 },
          },
          additionalProperties: false,
        },
        output: {
          example: {
            ok: true,
            rail: "stripe_x402",
            status: "pending_settlement",
          },
          schema: {
            properties: {
              ok: { type: "boolean" },
              rail: { type: "string" },
              status: { type: "string" },
              tipId: { type: "string" },
            },
            required: ["ok", "rail", "status"],
          },
        },
      }),
      [PAYMENT_IDENTIFIER]: declarePaymentIdentifierExtension(false),
    },
  } satisfies RouteConfig;
}

function getResourceServer() {
  if (!resourceServer) {
    const facilitatorClient = new HTTPFacilitatorClient({
      ...createFacilitatorConfig(
        process.env.CDP_API_KEY_ID,
        process.env.CDP_API_KEY_SECRET,
      ),
      url: getX402FacilitatorUrl(),
    });

    resourceServer = new x402ResourceServer(facilitatorClient)
      .register(getX402Network() as Network, new ExactEvmScheme())
      .registerExtension(paymentIdentifierResourceServerExtension)
      .registerExtension(bazaarResourceServerExtension)
      .onAfterSettle(async (context) => {
        const paymentPayload = context.paymentPayload as PaymentPayload;
        const depositAddress = getPayToFromPaymentPayload(paymentPayload);

        if (!depositAddress) {
          return;
        }

        const tip = await markX402TipVerified({
          network: context.requirements.network,
          depositAddress,
          paymentIdentifier: extractPaymentIdentifier(paymentPayload, false),
          receiptMetadata: {
            x402Transaction: context.result.transaction,
            x402Payer: context.result.payer ?? null,
            x402Amount: context.result.amount ?? null,
            x402Network: context.result.network,
          },
        });

        await markTipPaid({
          tipId: tip?.id,
          paymentIntentId: tip?.stripePaymentIntentId,
          receiptMetadata: {
            x402Transaction: context.result.transaction,
            x402Payer: context.result.payer ?? null,
            x402Amount: context.result.amount ?? null,
            x402Network: context.result.network,
          },
        });
      })
      .onSettleFailure(async (context) => {
        const paymentPayload = context.paymentPayload as PaymentPayload;
        const depositAddress = getPayToFromPaymentPayload(paymentPayload);

        if (!depositAddress) {
          return;
        }

        const tip = await findX402TipByDepositAddress({
          network: context.requirements.network,
          depositAddress,
        });

        await markTipFailed({
          paymentIntentId: tip?.stripePaymentIntentId,
          status: "failed",
          receiptMetadata: {
            x402Error: context.error.message,
            x402Network: context.requirements.network,
          },
        });
      });
  }

  return resourceServer;
}

function getProtectedPost() {
  if (!protectedPost) {
    protectedPost = withX402(x402TipHandler, getRouteConfig(), getResourceServer());
  }

  return protectedPost;
}

async function x402TipHandler(request: NextRequest) {
  const amountCents = parseTipAmountFromPath(new URL(request.url).pathname);
  const paymentPayload = decodePaymentHeader(getPaymentHeader(request));
  const depositAddress = getPayToFromPaymentPayload(paymentPayload);
  const paymentIdentifier = paymentPayload
    ? extractPaymentIdentifier(paymentPayload, false)
    : null;
  const tip = depositAddress
    ? await markX402TipVerified({
        network: getX402Network(),
        depositAddress,
        paymentIdentifier,
        receiptMetadata: {
          x402VerifiedAt: new Date().toISOString(),
        },
      })
    : null;

  return NextResponse.json({
    ok: true,
    tipId: tip?.id ?? null,
    amountCents,
    currency: "usd",
    rail: "stripe_x402",
    network: getX402Network(),
    status: "pending_settlement",
    paymentIdentifier,
    access: {
      grantsPermissions: false,
      message: "Tips are voluntary and do not unlock session access.",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!(await checkDemoRateLimit(getRequestActorKey(request), "tip"))) {
    return NextResponse.json(
      { error: "Too many tip attempts. Try again in a moment." },
      { status: 429 },
    );
  }

  try {
    parseTipAmountFromPath(new URL(request.url).pathname);
  } catch {
    return NextResponse.json({ error: "Unsupported tip amount." }, { status: 400 });
  }

  if (!isX402Configured()) {
    return NextResponse.json(
      { error: "x402 tips are not configured." },
      { status: 503 },
    );
  }

  return getProtectedPost()(request);
}
