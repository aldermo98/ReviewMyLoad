import { Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { createPaymentRequestAction } from "@/app/(app)/dashboard/actions";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">New request</p>
      <h1 className="mt-4 text-3xl font-semibold">Create a payment request in one pass.</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Manual job entry is enough for the MVP. CRM adapters can plug into this same workflow later.
      </p>
      <form action={createPaymentRequestAction} className="mt-8 grid gap-4 md:grid-cols-2">
        <Field label="Customer name" name="customerName" required />
        <Field label="Customer email" name="customerEmail" type="email" required />
        <Field label="Service type" name="serviceType" placeholder="Junk removal" required />
        <Field label="City" name="city" placeholder="Sacramento" />
        <div className="md:col-span-2">
          <Field
            label="Job notes"
            name="notes"
            textarea
            description="Add details that help the review draft sound specific without sounding fake."
          />
        </div>
        <Field label="Amount (USD)" name="amount" type="number" placeholder="325" required />
        <div className="md:col-span-2 pt-2">
          <SubmitButton>Create and send payment link</SubmitButton>
        </div>
      </form>
    </div>
  );
}
