import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { Field } from "@/components/field";
import { signInAction } from "@/app/(auth)/actions";

export default function SignInPage() {
  return (
    <AuthForm
      title="Sign in"
      description="Access your payment-powered review pipeline."
      action={signInAction}
      submitLabel="Sign in"
      footer={
        <>
          New here?{" "}
          <Link href="/sign-up" className="font-semibold text-amber-300">
            Create your free account
          </Link>
        </>
      }
    >
      <Field label="Email" name="email" type="email" required />
      <Field label="Password" name="password" type="password" required />
    </AuthForm>
  );
}
