import Link from "next/link";
import { CheckCircle2, CircleDashed, Link2 } from "lucide-react";

import { Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { requireOrganizationContext } from "@/lib/auth/session";
import { finishOnboardingAction, saveBusinessDetailsAction } from "@/app/(app)/dashboard/actions";

const checklist = [
  { label: "Create account", key: "account" },
  { label: "Connect payments", key: "payments" },
  { label: "Add business details", key: "business" },
  { label: "Add Google review URL", key: "review" },
  { label: "CRM placeholder", key: "crm" },
];

export default async function OnboardingPage() {
  const { organization } = await requireOrganizationContext();
  const paymentAccountConnected = Boolean(organization.paymentProviderAccount?.providerAccountId);

  return (
    <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Onboarding</p>
        <h1 className="mt-4 text-3xl font-semibold">Set up the free payment-powered workflow.</h1>
        <div className="mt-8 space-y-4">
          {checklist.map((item, index) => {
            const complete =
              item.key === "account"
                ? true
                : item.key === "payments"
                  ? paymentAccountConnected
                  : item.key === "business"
                    ? Boolean(organization.businessEmail && organization.businessName)
                    : item.key === "review"
                      ? Boolean(organization.googleReviewUrl)
                      : organization.onboardingStatus === "COMPLETE";

            const Icon = complete ? CheckCircle2 : CircleDashed;

            return (
              <div key={item.key} className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#faf8f4] text-teal-700">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Step 0{index + 1}</p>
                  <p className="mt-1 font-medium text-slate-900">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-[1.75rem] bg-slate-950 p-5 text-white">
          <p className="text-sm font-medium text-slate-200">Payments setup</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Connect payouts once so every payment request can stay inside the free product model.
          </p>
          <Link
            href="/api/payments/connect"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            <Link2 className="size-4" />
            {paymentAccountConnected ? "Refresh payments setup" : "Connect payments"}
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Business details</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Keep this tight. The app uses these details to power payment receipts, branding, and review destinations.
        </p>
        <form action={saveBusinessDetailsAction} className="mt-8 grid gap-4 md:grid-cols-2">
          <Field label="Business name" name="businessName" defaultValue={organization.businessName ?? organization.name} required />
          <Field label="Business email" name="businessEmail" type="email" defaultValue={organization.businessEmail} required />
          <Field label="Primary city" name="city" defaultValue={organization.city} />
          <Field label="Website URL" name="websiteUrl" defaultValue={organization.websiteUrl} />
          <div className="md:col-span-2">
            <Field
              label="Google review URL"
              name="googleReviewUrl"
              defaultValue={organization.googleReviewUrl}
              placeholder="https://g.page/r/..."
              required
            />
          </div>
          <div className="md:col-span-2 pt-2">
            <SubmitButton>Save onboarding details</SubmitButton>
          </div>
        </form>
        <form action={finishOnboardingAction} className="mt-3">
          <SubmitButton className="bg-slate-950">Finish onboarding</SubmitButton>
        </form>
      </section>
    </div>
  );
}
