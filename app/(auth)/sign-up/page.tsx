import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { Field } from "@/components/field";
import { signUpAction } from "@/app/(auth)/actions";

export default function SignUpPage() {
  return (
    <AuthForm
      title="Start free"
      description="Use our payment flow, get paid through Stripe, and automatically turn completed jobs into better review requests."
      action={signUpAction}
      submitLabel="Create free account"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-amber-300">
            Sign in
          </Link>
        </>
      }
    >
      <Field label="Your name" name="fullName" required />
      <Field label="Business name" name="businessName" required />
      <Field label="Email" name="email" type="email" required />
      <Field label="Password" name="password" type="password" required />
    </AuthForm>
  );
}
