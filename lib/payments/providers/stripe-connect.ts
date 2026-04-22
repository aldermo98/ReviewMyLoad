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
import type { PaymentProvider } from "@/lib/payments/provider";
import type {
  PaymentCheckoutSession,
  PaymentOnboardingLink,
  PaymentProviderAccountRecord,
} from "@/lib/payments/types";
import { absoluteUrl } from "@/lib/utils";

let stripeClient: Stripe | null = null;

export class StripeConnectProvider implements PaymentProvider {
  readonly type = "stripe" as const;
  readonly displayName = "Payments";

  getClient() {
    const env = getEnv();

    if (!env.STRIPE_SECRET_KEY) {
      return null;
    }

    stripeClient ??= new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover" as Stripe.StripeConfig["apiVersion"],
    });

    return stripeClient;
  }

  async createMerchantOnboardingLink(organizationId: string): Promise<PaymentOnboardingLink> {
    const stripe = this.getClient();
    if (!stripe) {
      throw new Error("Payments are not configured.");
    }

    const account = await this.ensureMerchantAccount(organizationId);

    const link = await stripe.accountLinks.create({
      account: account.providerAccountId,
      refresh_url: absoluteUrl("/dashboard/onboarding?refresh=1"),
      return_url: absoluteUrl("/dashboard/onboarding?payments=connected"),
      type: "account_onboarding",
    });

    await updateStripeAccountById(account.id, { onboardingUrl: link.url });

    return {
      provider: this.type,
      url: link.url,
    };
  }

  async createCheckoutSession(paymentRequestId: string): Promise<PaymentCheckoutSession> {
    const stripe = this.getClient();

    if (!stripe) {
      throw new Error("Payments are not configured.");
    }

    const paymentRequest = (await getPaymentRequestContextById(paymentRequestId)) as any;

    if (!paymentRequest.organization.paymentProviderAccount) {
      throw new Error("Merchant must complete payments onboarding before sending payment links.");
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
          destination: paymentRequest.organization.paymentProviderAccount.providerAccountId,
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

    return {
      provider: this.type,
      id: session.id,
      url: session.url,
    };
  }

  async ensureMerchantAccount(organizationId: string): Promise<PaymentProviderAccountRecord> {
    const existing = (await getStripeAccountForOrganization(organizationId)) as any;

    if (existing) {
      return this.mapAccountRecord(existing);
    }

    const stripe = this.getClient();
    if (!stripe) {
      throw new Error("Payments are not configured.");
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

    const record = await createStripeAccountRecord({
      organizationId,
      stripeAccountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });

    return this.mapAccountRecord(record as Record<string, any>);
  }

  private mapAccountRecord(record: Record<string, any>): PaymentProviderAccountRecord {
    return {
      id: record.id,
      organizationId: record.organizationId,
      provider: this.type,
      providerAccountId: record.stripeAccountId,
      onboardingUrl: record.onboardingUrl ?? null,
      dashboardUrl: record.dashboardUrl ?? null,
      detailsSubmitted: Boolean(record.detailsSubmitted),
      chargesEnabled: Boolean(record.chargesEnabled),
      payoutsEnabled: Boolean(record.payoutsEnabled),
    };
  }
}

