import { notFound } from "next/navigation";

import { ReviewEditor } from "@/components/review-editor";
import { markReviewPostedAction } from "@/app/(app)/dashboard/actions";
import { getPublicReviewPageData } from "@/lib/data/app-data";

export default async function PublicReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const reviewPage = (await getPublicReviewPageData(token)) as any;

  if (!reviewPage) {
    notFound();
  }

  const { paymentRequest, organization, review } = reviewPage;

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300/85">Thank you</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">
            Payment received for {organization.businessName ?? organization.name}.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            If you want to leave feedback, we drafted something you can edit first. Nothing is posted for you.
          </p>
        </section>

        {review?.reviewDraft ? (
          <ReviewEditor
            token={token}
            initialValue={review.reviewDraft}
            googleReviewUrl={organization.googleReviewUrl}
          />
        ) : (
          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Review draft is still getting ready</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              We are finishing the follow-up message for this job. Please check back in a moment or use the Google review button once it is available.
            </p>
          </section>
        )}

        <form action={markReviewPostedAction} className="flex">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-900"
          >
            I left my review
          </button>
        </form>
      </div>
    </main>
  );
}
