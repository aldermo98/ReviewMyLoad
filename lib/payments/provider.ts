import type { PaymentCheckoutSession, PaymentOnboardingLink, PaymentProviderType } from "@/lib/payments/types";

export interface PaymentProvider {
  readonly type: PaymentProviderType;
  readonly displayName: string;

  createMerchantOnboardingLink(organizationId: string): Promise<PaymentOnboardingLink>;
  createCheckoutSession(paymentRequestId: string): Promise<PaymentCheckoutSession>;
}

