import Stripe from "stripe";

import { markTipFailed, markTipPaid } from "@/lib/tips/db";
import { getStripe, getStripeObjectId } from "@/lib/tips/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getMetadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
) {
  const value = metadata?.[key];

  return typeof value === "string" && value ? value : null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return Response.json(
      { error: "Stripe webhook secret is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = getStripe();
  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tipId =
        getMetadataValue(session.metadata, "tipId") || session.client_reference_id;
      const paymentIntentId = getStripeObjectId(session.payment_intent);

      await markTipPaid({
        tipId,
        checkoutSessionId: session.id,
        paymentIntentId,
        receiptMetadata: {
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          paymentStatus: session.payment_status,
        },
      });
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;

      await markTipFailed({
        checkoutSessionId: session.id,
        paymentIntentId: getStripeObjectId(session.payment_intent),
        status: "cancelled",
        receiptMetadata: {
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeCheckoutSessionId: session.id,
        },
      });
      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      await markTipPaid({
        tipId: getMetadataValue(paymentIntent.metadata, "tipId"),
        paymentIntentId: paymentIntent.id,
        receiptMetadata: {
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripePaymentIntentId: paymentIntent.id,
          amountReceived: paymentIntent.amount_received,
          currency: paymentIntent.currency,
        },
      });
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      await markTipFailed({
        paymentIntentId: paymentIntent.id,
        status: "failed",
        receiptMetadata: {
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripePaymentIntentId: paymentIntent.id,
          lastPaymentError: paymentIntent.last_payment_error?.code ?? null,
        },
      });
      break;
    }

    default:
      break;
  }

  return Response.json({ received: true });
}
