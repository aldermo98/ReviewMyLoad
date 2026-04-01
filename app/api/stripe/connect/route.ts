import { NextResponse } from "next/server";

import { requireOrganizationContext } from "@/lib/auth/session";
import { createStripeOnboardingLink } from "@/lib/billing/stripe";

export async function GET() {
  const { organization } = await requireOrganizationContext();
  const url = await createStripeOnboardingLink(organization.id);

  return NextResponse.redirect(url);
}
