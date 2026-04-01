import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  getOrCreateWebhookEvent,
  getPaymentRequestContextById,
  markWebhookProcessed,
  updateJob,
  updatePaymentRequest,
  updateStripeAccountByStripeId,
  upsertPaymentByCheckoutSession,
} from "@/lib/data/app-data";
import { getEnv } from "@/lib/env";
import { generateReviewForPaymentRequest } from "@/lib/reviews/generate-review";
import { sendEmail } from "@/lib/email/resend";
import { paymentSucceededMerchantEmail } from "@/lib/email/templates";
import { absoluteUrl, formatCurrency } from "@/lib/utils";
import { getStripe } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  const env = getEnv();

  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid signature." },
      { status: 400 },
    );
  }

  const existing = (await getOrCreateWebhookEvent(event.id, event as unknown as object)) as any;

  if (existing?.processedAt) {
    return NextResponse.json({ received: true, deduped: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentRequestId = session.metadata?.paymentRequestId;

    if (paymentRequestId) {
      const paymentRequest = (await getPaymentRequestContextById(paymentRequestId)) as any;

      if (paymentRequest) {
        await updatePaymentRequest(paymentRequest.id, { status: "PAID" });

        await updateJob(paymentRequest.jobId, {
          status: "PAID",
          completedAt: new Date().toISOString(),
        });

        await upsertPaymentByCheckoutSession({
          organizationId: paymentRequest.organizationId,
          jobId: paymentRequest.jobId,
          paymentRequestId: paymentRequest.id,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
          amountCents: paymentRequest.amountCents,
          currency: session.currency ?? "usd",
          status: "SUCCEEDED",
          paidAt: new Date().toISOString(),
          rawStatus: session.payment_status,
        });

        await generateReviewForPaymentRequest(paymentRequest.id);

        if (paymentRequest.organization.emailMerchantOnPaid && paymentRequest.organization.businessEmail) {
          const template = paymentSucceededMerchantEmail({
            businessName: paymentRequest.organization.businessName ?? paymentRequest.organization.name,
            customerName: paymentRequest.job.customer.name,
            amountFormatted: formatCurrency(paymentRequest.amountCents),
            reviewUrl: absoluteUrl(`/review/${paymentRequest.hostedReviewToken}`),
            serviceType: paymentRequest.job.serviceType,
          });

          await sendEmail({
            to: paymentRequest.organization.businessEmail,
            subject: template.subject,
            html: template.html,
          });
        }
      }
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    await upsertPaymentByCheckoutSession({
      stripeCheckoutSessionId: paymentIntent.metadata?.stripeCheckoutSessionId ?? `pi-${paymentIntent.id}`,
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId:
        typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : null,
      rawStatus: paymentIntent.status,
      status: "SUCCEEDED",
      amountCents: paymentIntent.amount,
      currency: paymentIntent.currency,
      organizationId: paymentIntent.metadata?.organizationId,
      jobId: paymentIntent.metadata?.jobId,
      paymentRequestId: paymentIntent.metadata?.paymentRequestId,
      paidAt: new Date().toISOString(),
    });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;

    await updateStripeAccountByStripeId(account.id, {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  }

  await markWebhookProcessed(event.id);

  return NextResponse.json({ received: true });
}
