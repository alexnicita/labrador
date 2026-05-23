import Stripe from "stripe";

import { getStripeCryptoNetworkKey } from "@/lib/tips/config";

export const STRIPE_MACHINE_PAYMENTS_API_VERSION = "2026-03-04.preview";

type StripeCryptoDepositAddress = {
  address?: string;
  supported_tokens?: Array<{
    token_currency?: string;
    token_contract_address?: string;
  }>;
};

type StripeCryptoDisplayDetails = {
  deposit_addresses?: Record<string, StripeCryptoDepositAddress>;
};

type StripeCryptoPaymentIntent = Stripe.PaymentIntent & {
  next_action?: Stripe.PaymentIntent.NextAction | null | {
    crypto_display_details?: StripeCryptoDisplayDetails;
    crypto_collect_deposit_details?: StripeCryptoDisplayDetails;
  };
};

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    stripeClient = new Stripe(secretKey, {
      // Stripe's SDK narrows this to its generated stable version, but
      // crypto deposit-mode PaymentIntents currently require the preview.
      apiVersion: STRIPE_MACHINE_PAYMENTS_API_VERSION as "2026-04-22.dahlia",
    });
  }

  return stripeClient;
}

export async function createStripeCryptoDepositPaymentIntent({
  amountCents,
  metadata,
}: {
  amountCents: number;
  metadata: Record<string, string>;
}) {
  const stripe = getStripe();
  const networkKey = getStripeCryptoNetworkKey();
  const params = {
    amount: amountCents,
    currency: "usd",
    payment_method_types: ["crypto"],
    payment_method_data: {
      type: "crypto",
    },
    payment_method_options: {
      crypto: {
        mode: "deposit",
        deposit_options: {
          networks: [networkKey],
        },
      },
    },
    confirm: true,
    metadata,
  } satisfies Record<string, unknown>;

  const paymentIntent = (await stripe.paymentIntents.create(
    params as Stripe.PaymentIntentCreateParams,
  )) as StripeCryptoPaymentIntent;
  const depositDetails =
    paymentIntent.next_action &&
    ("crypto_display_details" in paymentIntent.next_action
      ? paymentIntent.next_action.crypto_display_details
      : "crypto_collect_deposit_details" in paymentIntent.next_action
        ? paymentIntent.next_action.crypto_collect_deposit_details
        : null);
  const depositAddress = depositDetails?.deposit_addresses?.[networkKey];

  if (!depositAddress?.address) {
    throw new Error("Stripe PaymentIntent did not return a crypto deposit address");
  }

  return {
    paymentIntent,
    depositAddress: depositAddress.address,
    supportedTokens: depositAddress.supported_tokens ?? [],
  };
}

export function getStripeObjectId(
  value: string | { id?: string } | null | undefined,
) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id || null;
}
