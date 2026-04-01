import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmitButton } from "@/components/submit-button";
import { createDemoSuccessAction } from "@/app/(app)/dashboard/actions";
import { requireOrganizationContext } from "@/lib/auth/session";
import { getJobDetail } from "@/lib/data/app-data";
import { absoluteUrl, formatCurrency, formatDate } from "@/lib/utils";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organization } = await requireOrganizationContext();
  const { id } = await params;

  const job = (await getJobDetail(organization.id, id)) as any;

  if (!job) {
    notFound();
  }

  const paymentRequest = job.paymentRequests[0];
  const review = job.reviewGenerations[0];

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_0.8fr]">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Job detail</p>
            <h1 className="mt-3 text-3xl font-semibold">{job.customer.name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {job.serviceType} {job.city ? `in ${job.city}` : ""} for {formatCurrency(job.amountCents)}
            </p>
          </div>
          {paymentRequest?.shareableUrl ? (
            <a
              href={paymentRequest.shareableUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-900"
            >
              Open Stripe Checkout
            </a>
          ) : null}
        </div>

        <dl className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-[1.5rem] bg-[#faf8f4] p-5">
            <dt className="text-xs uppercase tracking-[0.32em] text-slate-500">Customer</dt>
            <dd className="mt-3 text-sm text-slate-800">{job.customer.email}</dd>
          </div>
          <div className="rounded-[1.5rem] bg-[#faf8f4] p-5">
            <dt className="text-xs uppercase tracking-[0.32em] text-slate-500">Created</dt>
            <dd className="mt-3 text-sm text-slate-800">{formatDate(job.createdAt)}</dd>
          </div>
          <div className="rounded-[1.5rem] bg-[#faf8f4] p-5">
            <dt className="text-xs uppercase tracking-[0.32em] text-slate-500">Payment request</dt>
            <dd className="mt-3 text-sm text-slate-800">{paymentRequest?.status ?? "Not created"}</dd>
          </div>
          <div className="rounded-[1.5rem] bg-[#faf8f4] p-5">
            <dt className="text-xs uppercase tracking-[0.32em] text-slate-500">Review generation</dt>
            <dd className="mt-3 text-sm text-slate-800">{review?.status ?? "Pending"}</dd>
          </div>
        </dl>

        <div className="mt-8 rounded-[1.75rem] border border-slate-200 p-5">
          <h2 className="text-lg font-semibold">Job notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {job.notes || "No notes added yet."}
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Links</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="font-medium text-slate-900">Shareable payment link</p>
              <p className="mt-2 break-all text-slate-500">{paymentRequest?.shareableUrl ?? "Not ready yet"}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Hosted review page</p>
              <Link
                href={`/review/${paymentRequest?.hostedReviewToken ?? ""}`}
                className="mt-2 block break-all text-teal-700"
              >
                {paymentRequest ? absoluteUrl(`/review/${paymentRequest.hostedReviewToken}`) : "Pending"}
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Review draft</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {review?.reviewDraft ?? "No review draft yet. Stripe webhooks are the source of truth, but you can use the demo button below during setup."}
          </p>
        </div>

        {paymentRequest?.status !== "PAID" ? (
          <form
            action={async () => {
              "use server";
              await createDemoSuccessAction(paymentRequest.id);
            }}
            className="rounded-[2rem] bg-slate-950 p-6 text-white"
          >
            <h2 className="text-lg font-semibold">Demo payment success</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Use this while local Stripe webhooks are not wired yet. It simulates a successful payment, generates the review, and sends the merchant notification.
            </p>
            <div className="mt-5">
              <SubmitButton className="bg-white text-slate-950 hover:bg-slate-100">Mark as paid</SubmitButton>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
