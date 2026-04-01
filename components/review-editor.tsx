"use client";

import { useState, useTransition } from "react";
import { Copy, ExternalLink } from "lucide-react";

export function ReviewEditor({
  token,
  initialValue,
  googleReviewUrl,
}: {
  token: string;
  initialValue: string;
  googleReviewUrl?: string | null;
}) {
  const [value, setValue] = useState(initialValue);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function markReviewInteraction(payload: Record<string, unknown>) {
    await fetch(`/api/review/${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    startTransition(() => {
      void markReviewInteraction({
        copied: true,
        customerEditedReview: value,
      });
    });
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Review draft
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Edit this however you want. Nothing is posted automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Copy className="size-4" />
            {copied ? "Copied" : "Copy review"}
          </button>
          {googleReviewUrl ? (
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-900"
            >
              <ExternalLink className="size-4" />
              Leave a Google review
            </a>
          ) : null}
        </div>
      </div>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          startTransition(() => {
            void markReviewInteraction({ customerEditedReview: value });
          });
        }}
        className="mt-6 min-h-64 w-full rounded-[1.5rem] border border-slate-200 bg-[#faf8f4] px-4 py-4 text-base leading-7 text-slate-900 outline-none transition focus:border-slate-900"
      />
      <p className="mt-3 text-xs text-slate-500">
        {isPending ? "Saving your edits..." : "You can adjust wording, details, or length before posting."}
      </p>
    </div>
  );
}
