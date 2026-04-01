import Stripe from "stripe";

import {
  createStripeAccountRecord,
  getOrganizationById,
  getPaymentRequestContextById,
  getStripeAccountForOrganization,
  updatePaymentRequest,
  updateStripeAccountById,
} from "@/lib/data/app-data";
import { getEnv } from "@/lib/env";
import { absoluteUrl } from "@/lib/utils";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const env = getEnv();

  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }

  stripeClient ??= new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover" as Stripe.StripeConfig["apiVersion"],
  });

  return stripeClient;
}

export async function ensureStripeAccountForOrganization(organizationId: string) {
  const existing = (await getStripeAccountForOrganization(organizationId)) as any;

  if (existing) {
    return existing;
  }

  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const organization = (await getOrganizationById(organizationId)) as any;

  const account = await stripe.accounts.create({
    country: getEnv().STRIPE_CONNECT_PLATFORM_COUNTRY,
    business_type: "company",
    company: {
      name: organization.businessName ?? organization.name,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      organizationId,
    },
  });

  return createStripeAccountRecord({
    organizationId,
    stripeAccountId: account.id,
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  });
}

export async function createStripeOnboardingLink(organizationId: string) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const stripeAccount = (await ensureStripeAccountForOrganization(organizationId)) as any;

  const link = await stripe.accountLinks.create({
    account: stripeAccount.stripeAccountId,
    refresh_url: absoluteUrl("/dashboard/onboarding?refresh=1"),
    return_url: absoluteUrl("/dashboard/onboarding?stripe=connected"),
    type: "account_onboarding",
  });

  await updateStripeAccountById(stripeAccount.id, { onboardingUrl: link.url });

  return link.url;
}

export async function createCheckoutForPaymentRequest(paymentRequestId: string) {
  const stripe = getStripe();

  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const paymentRequest = (await getPaymentRequestContextById(paymentRequestId)) as any;

  if (!paymentRequest.organization.stripeAccount) {
    throw new Error("Merchant must complete Stripe onboarding before sending payment links.");
  }

  const appFee = Math.round(
    paymentRequest.amountCents * (getEnv().STRIPE_APPLICATION_FEE_PERCENT / 100),
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: paymentRequest.job.customer.email,
    success_url: absoluteUrl(`/review/${paymentRequest.hostedReviewToken}?checkout=success`),
    cancel_url: absoluteUrl("/dashboard/jobs?checkout=cancelled"),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: paymentRequest.amountCents,
          product_data: {
            name: `${paymentRequest.job.serviceType} payment`,
            description: paymentRequest.job.notes?.slice(0, 180) ?? undefined,
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: appFee,
      transfer_data: {
        destination: paymentRequest.organization.stripeAccount.stripeAccountId,
      },
      metadata: {
        organizationId: paymentRequest.organizationId,
        jobId: paymentRequest.jobId,
        paymentRequestId: paymentRequest.id,
      },
    },
    metadata: {
      organizationId: paymentRequest.organizationId,
      jobId: paymentRequest.jobId,
      paymentRequestId: paymentRequest.id,
    },
  });

  await updatePaymentRequest(paymentRequest.id, {
    status: "CHECKOUT_CREATED",
    stripeCheckoutSessionId: session.id,
    shareableUrl: session.url,
  });

  return session;
}
