import { NextResponse } from "next/server";

import { requireOrganizationContext } from "@/lib/auth/session";
import { createMerchantOnboardingLink } from "@/lib/payments";

export async function GET() {
  const { organization } = await requireOrganizationContext();
  const { url } = await createMerchantOnboardingLink(organization.id);

  return NextResponse.redirect(url);
}

