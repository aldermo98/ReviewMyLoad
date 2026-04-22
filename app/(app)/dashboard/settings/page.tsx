import { Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import {
  connectGoHighLevelAction,
  disconnectGoHighLevelAction,
  saveSettingsAction,
} from "@/app/(app)/dashboard/actions";
import { requireOrganizationContext } from "@/lib/auth/session";

export default async function SettingsPage() {
  const { organization } = await requireOrganizationContext();
  const ghlConnection = organization.integrationConnections?.find(
    (connection: Record<string, any>) => connection.type === "GHL" && connection.status === "CONNECTED",
  );
  const ghlMeta = (ghlConnection?.metadata ?? {}) as Record<string, any>;

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
          Branding placeholder: lightweight brand colors are supported now. Full white-label controls are intentionally out of scope for this MVP.
        </div>
        <div className="md:col-span-2">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </form>

      <section className="mt-10 rounded-[1.75rem] border border-slate-200 p-5">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">CRM</p>
        <h2 className="mt-3 text-xl font-semibold">GoHighLevel</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Connect a GoHighLevel private integration token for your sub-account so Ready Now can grow into job and contact sync later without changing your core workflow.
        </p>

        {ghlConnection ? (
          <div className="mt-5 rounded-[1.5rem] bg-[#faf8f4] p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Connected</p>
            <p className="mt-2">Location: {ghlMeta.locationName ?? ghlMeta.locationId}</p>
            <p className="mt-1">Location ID: {ghlMeta.locationId ?? ghlConnection.externalAccountId}</p>
            <p className="mt-1">Token ending: {ghlMeta.tokenLast4 ? `••••${ghlMeta.tokenLast4}` : "stored securely"}</p>
            <form action={disconnectGoHighLevelAction} className="mt-4">
              <SubmitButton className="bg-slate-950">Disconnect GoHighLevel</SubmitButton>
            </form>
          </div>
        ) : (
          <form action={connectGoHighLevelAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label="Sub-account (location) ID"
              name="ghlLocationId"
              placeholder="ve9EPM428h8vShlRW1KT"
              required
              description="Use the GoHighLevel sub-account ID you want Ready Now to connect to."
            />
            <Field
              label="Private integration token"
              name="ghlPrivateIntegrationToken"
              type="password"
              required
              description="Create this in GoHighLevel for the same sub-account. Ready Now verifies it before saving."
            />
            <div className="md:col-span-2">
              <SubmitButton>Connect GoHighLevel</SubmitButton>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
