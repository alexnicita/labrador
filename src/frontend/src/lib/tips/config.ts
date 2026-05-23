import { getAbsoluteUrl } from "@/lib/site-url";

export const CHECKOUT_TIP_AMOUNTS_CENTS = [100, 500, 2000] as const;
export const X402_TIP_AMOUNTS_CENTS = [1, 100, 500, 2000] as const;

export const X402_FACILITATOR_URL_DEFAULT =
  "https://api.cdp.coinbase.com/platform/v2/x402";
export const X402_NETWORK_DEFAULT = "eip155:8453";

const stripePriceEnvByAmount = {
  100: "STRIPE_TIP_PRICE_100",
  500: "STRIPE_TIP_PRICE_500",
  2000: "STRIPE_TIP_PRICE_2000",
} as const satisfies Record<(typeof CHECKOUT_TIP_AMOUNTS_CENTS)[number], string>;

const stripePaymentLinkEnvByAmount = {
  100: "STRIPE_TIP_LINK_100",
  500: "STRIPE_TIP_LINK_500",
  2000: "STRIPE_TIP_LINK_2000",
} as const satisfies Record<(typeof CHECKOUT_TIP_AMOUNTS_CENTS)[number], string>;

export type CheckoutTipAmountCents = (typeof CHECKOUT_TIP_AMOUNTS_CENTS)[number];
export type X402TipAmountCents = (typeof X402_TIP_AMOUNTS_CENTS)[number];

export type PublicTipConfig = ReturnType<typeof getPublicTipConfig>;

export function formatTipAmount(amountCents: number) {
  const dollars = amountCents / 100;

  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function formatX402UsdPrice(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

export function isCheckoutTipAmount(
  amountCents: number,
): amountCents is CheckoutTipAmountCents {
  return CHECKOUT_TIP_AMOUNTS_CENTS.includes(
    amountCents as CheckoutTipAmountCents,
  );
}

export function isX402TipAmount(
  amountCents: number,
): amountCents is X402TipAmountCents {
  return X402_TIP_AMOUNTS_CENTS.includes(amountCents as X402TipAmountCents);
}

export function getStripeTipPriceId(amountCents: CheckoutTipAmountCents) {
  return process.env[stripePriceEnvByAmount[amountCents]] || null;
}

export function getStripeTipPaymentLink(amountCents: CheckoutTipAmountCents) {
  return process.env[stripePaymentLinkEnvByAmount[amountCents]] || null;
}

export function isStripeCheckoutApiConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      CHECKOUT_TIP_AMOUNTS_CENTS.every((amount) => getStripeTipPriceId(amount)),
  );
}

export function isStripePaymentLinksConfigured() {
  return CHECKOUT_TIP_AMOUNTS_CENTS.every((amount) =>
    getStripeTipPaymentLink(amount),
  );
}

export function isStripeCheckoutConfigured() {
  return isStripeCheckoutApiConfigured() || isStripePaymentLinksConfigured();
}

export function getX402FacilitatorUrl() {
  return process.env.X402_FACILITATOR_URL || X402_FACILITATOR_URL_DEFAULT;
}

export function getX402Network() {
  return process.env.X402_NETWORK || X402_NETWORK_DEFAULT;
}

export function getStripeCryptoNetworkKey() {
  const network = getX402Network();

  if (network === "eip155:8453" || network === "eip155:84532") {
    return "base";
  }

  return "base";
}

export function isX402Configured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.CDP_API_KEY_ID &&
      process.env.CDP_API_KEY_SECRET &&
      getX402FacilitatorUrl() &&
      getX402Network(),
  );
}

export function getPublicTipConfig() {
  const checkoutAvailable = isStripeCheckoutConfigured();
  const x402Available = isX402Configured();

  return {
    recipient: "Labrador",
    checkout: {
      available: checkoutAvailable,
      endpoint: getAbsoluteUrl("/api/tips/checkout"),
      presets: CHECKOUT_TIP_AMOUNTS_CENTS.map((amountCents) => ({
        amountCents,
        label: formatTipAmount(amountCents),
        configured: Boolean(
          getStripeTipPriceId(amountCents) ||
            getStripeTipPaymentLink(amountCents),
        ),
      })),
    },
    x402: {
      available: x402Available,
      network: getX402Network(),
      facilitatorUrl: getX402FacilitatorUrl(),
      endpointTemplate: getAbsoluteUrl("/api/tips/x402/{amountCents}"),
      amounts: X402_TIP_AMOUNTS_CENTS.map((amountCents) => ({
        amountCents,
        label: formatTipAmount(amountCents),
        endpoint: getAbsoluteUrl(`/api/tips/x402/${amountCents}`),
      })),
      paymentIdentifier: {
        supported: true,
        required: false,
      },
      bazaarDiscovery: true,
    },
    access: {
      grantsPermissions: false,
      message: "Tips are voluntary and do not unlock session access.",
    },
  };
}
