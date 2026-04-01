import { Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { saveSettingsAction } from "@/app/(app)/dashboard/actions";
import { requireOrganizationContext } from "@/lib/auth/session";

export default async function SettingsPage() {
  const { organization } = await requireOrganizationContext();

  return (
    <div className="mx-auto max-w-4xl rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Settings</p>
      <h1 className="mt-4 text-3xl font-semibold">Business and follow-up defaults</h1>
      <form action={saveSettingsAction} className="mt-8 grid gap-5 md:grid-cols-2">
        <Field label="Business name" name="businessName" defaultValue={organization.businessName ?? organization.name} required />
        <Field label="Google review URL" name="googleReviewUrl" defaultValue={organization.googleReviewUrl} />
        <Field label="Brand primary color" name="brandPrimaryColor" type="color" defaultValue={organization.brandPrimaryColor ?? "#0F766E"} />
        <Field label="Brand accent color" name="brandAccentColor" type="color" defaultValue={organization.brandAccentColor ?? "#F59E0B"} />

        <label className="flex items-start gap-3 rounded-[1.5rem] bg-[#faf8f4] p-4 text-sm text-slate-700 md:col-span-2">
          <input type="checkbox" name="emailCustomerOnCreate" defaultChecked={organization.emailCustomerOnCreate} className="mt-1" />
          Email customers their Stripe payment link automatically
        </label>
        <label className="flex items-start gap-3 rounded-[1.5rem] bg-[#faf8f4] p-4 text-sm text-slate-700 md:col-span-2">
          <input type="checkbox" name="emailMerchantOnCreate" defaultChecked={organization.emailMerchantOnCreate} className="mt-1" />
          Email the merchant when a payment request is created
        </label>
        <label className="flex items-start gap-3 rounded-[1.5rem] bg-[#faf8f4] p-4 text-sm text-slate-700 md:col-span-2">
          <input type="checkbox" name="emailMerchantOnPaid" defaultChecked={organization.emailMerchantOnPaid} className="mt-1" />
          Email the merchant when payment succeeds
        </label>
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 p-4 text-sm text-slate-500 md:col-span-2">
          CRM settings placeholder: the MVP keeps manual entry first, but the adapter layer is ready for GHL, Jobber, Housecall Pro, and similar systems.
        </div>
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 p-4 text-sm text-slate-500 md:col-span-2">
          Branding placeholder: lightweight brand colors are supported now. Full white-label controls are intentionally out of scope for this MVP.
        </div>
        <div className="md:col-span-2">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </form>
    </div>
  );
}
