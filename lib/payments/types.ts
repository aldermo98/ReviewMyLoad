export type PaymentProviderType = "stripe";

export type PaymentProviderAccountStatus = {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

export type PaymentProviderAccountRecord = PaymentProviderAccountStatus & {
  id: string;
  organizationId: string;
  provider: PaymentProviderType;
  providerAccountId: string;
  onboardingUrl?: string | null;
  dashboardUrl?: string | null;
};

export type PaymentOnboardingLink = {
  provider: PaymentProviderType;
  url: string;
};

export type PaymentCheckoutSession = {
  provider: PaymentProviderType;
  id: string;
  url: string | null;
};

