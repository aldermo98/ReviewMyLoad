"use server";

import { redirect } from "next/navigation";

import { signInSchema, signUpSchema } from "@/lib/auth/validation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createAppUserWithOrganization, findAppUserByIdentity } from "@/lib/data/app-data";

export async function signUpAction(formData: FormData) {
  const values = signUpSchema.parse({
    fullName: formData.get("fullName"),
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const existingUser = await findAppUserByIdentity({
    email: values.email,
  });

  if (existingUser) {
    redirect("/sign-in?error=account-exists");
  }

  const admin = getSupabaseAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: true,
    user_metadata: {
      fullName: values.fullName,
      businessName: values.businessName,
    },
  });

  if (authError) {
    redirect("/sign-up?error=auth-signup-failed");
  }

  await createAppUserWithOrganization({
    email: values.email,
    fullName: values.fullName,
    businessName: values.businessName,
    supabaseUserId: authData.user?.id,
    onboardingStatus: "STRIPE_PENDING",
  });

  const supabase = await getSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (signInError) {
    redirect("/sign-in?error=signin-required");
  }

  redirect("/dashboard/onboarding");
}

export async function signInAction(formData: FormData) {
  const values = signInSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) {
    redirect("/sign-in?error=invalid-credentials");
  }

  const { data: authUserData } = await supabase.auth.getUser();
  const existingUser = await findAppUserByIdentity({
    email: values.email,
    supabaseUserId: authUserData.user?.id,
  });

  if (!existingUser) {
    await createAppUserWithOrganization({
      email: values.email,
      businessName: values.email.split("@")[0].replace(/[._-]+/g, " ") || "New business",
      supabaseUserId: authUserData.user?.id,
      onboardingStatus: "STARTED",
    });
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
