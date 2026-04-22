import { StripeConnectProvider } from "@/lib/payments/providers/stripe-connect";

let defaultProvider: StripeConnectProvider | null = null;

export function getDefaultPaymentProvider() {
  defaultProvider ??= new StripeConnectProvider();
  return defaultProvider;
}

export function getDefaultPaymentProviderLabel() {
  return getDefaultPaymentProvider().displayName;
}

export async function createMerchantOnboardingLink(organizationId: string) {
  return getDefaultPaymentProvider().createMerchantOnboardingLink(organizationId);
}

export async function createPaymentCheckoutSession(paymentRequestId: string) {
  return getDefaultPaymentProvider().createCheckoutSession(paymentRequestId);
}

export function getStripePaymentProvider() {
  return getDefaultPaymentProvider();
}

