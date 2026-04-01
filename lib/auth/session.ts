import { redirect } from "next/navigation";

import { getOrganizationContextByIdentity } from "@/lib/data/app-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return null;
  }

  const context = await getOrganizationContextByIdentity({
    email: authUser.email,
    supabaseUserId: authUser.id,
  });

  if (!context) return null;

  return {
    ...context.user,
    memberships: context.membership && context.organization
      ? [
          {
            ...context.membership,
            organization: context.organization as Record<string, any>,
          },
        ]
      : [],
  } as Record<string, any>;
}

export async function requireUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireOrganizationContext() {
  const user = await requireUser();
  const membership = user.memberships[0];

  if (!membership) {
    redirect("/sign-up");
  }

  return {
    user,
    membership,
    organization: membership.organization,
  };
}
