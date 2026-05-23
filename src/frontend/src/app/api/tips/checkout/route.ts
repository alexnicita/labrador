import { checkDemoRateLimit } from "@/lib/demo-feed/rate-limit";
import { getAbsoluteUrl } from "@/lib/site-url";
import {
  getStripeTipPaymentLink,
  getStripeTipPriceId,
  isCheckoutTipAmount,
  isStripeCheckoutApiConfigured,
  isStripeCheckoutConfigured,
} from "@/lib/tips/config";
import {
  attachCheckoutSessionToTip,
  createCheckoutTipRecord,
} from "@/lib/tips/db";
import { getRequestActorKey, readJsonBody } from "@/lib/tips/request";
import { getStripe, getStripeObjectId } from "@/lib/tips/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await checkDemoRateLimit(getRequestActorKey(request), "tip"))) {
    return Response.json(
      { error: "Too many tip attempts. Try again in a moment." },
      { status: 429 },
    );
  }

  if (!isStripeCheckoutConfigured()) {
    return Response.json(
      { error: "Stripe Checkout tips are not configured." },
      { status: 503 },
    );
  }

  const body = await readJsonBody(request);
  const amountCents = Number(body.amountCents);

  if (!Number.isInteger(amountCents) || !isCheckoutTipAmount(amountCents)) {
    return Response.json({ error: "Unsupported tip amount." }, { status: 400 });
  }

  const priceId = getStripeTipPriceId(amountCents);
  const paymentLink = getStripeTipPaymentLink(amountCents);

  if (!isStripeCheckoutApiConfigured()) {
    if (!paymentLink) {
      return Response.json(
        { error: "Stripe tip link is not configured for this amount." },
        { status: 503 },
      );
    }

    return Response.json({
      url: paymentLink,
      tipId: null,
      rail: "stripe_payment_link",
    });
  }

  if (!priceId) {
    return Response.json(
      { error: "Stripe Checkout price is not configured for this amount." },
      { status: 503 },
    );
  }

  const tip = await createCheckoutTipRecord({
    amountCents,
    note: body.note,
    sessionId: body.sessionId,
  });
  const metadata = {
    source: "labrador_tip",
    rail: "stripe_checkout",
    tipId: tip.id,
    amountCents: String(amountCents),
  };
  const stripe = getStripe();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: getAbsoluteUrl(`/?tip=success&amount=${amountCents}`),
    cancel_url: getAbsoluteUrl(`/?tip=cancelled&amount=${amountCents}`),
    client_reference_id: tip.id,
    metadata,
    payment_intent_data: {
      metadata,
    },
  });

  await attachCheckoutSessionToTip({
    tipId: tip.id,
    checkoutSessionId: checkoutSession.id,
    paymentIntentId: getStripeObjectId(checkoutSession.payment_intent),
  });

  if (!checkoutSession.url) {
    return Response.json(
      { error: "Stripe did not return a Checkout URL." },
      { status: 502 },
    );
  }

  return Response.json({
    url: checkoutSession.url,
    tipId: tip.id,
  });
}
