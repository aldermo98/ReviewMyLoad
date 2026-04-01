import Link from "next/link";

import { getDashboardStats } from "@/lib/dashboard/queries";
import { requireOrganizationContext } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const { organization } = await requireOrganizationContext();
  const stats = await getDashboardStats(organization.id);
  const recentJobs = stats.recentJobs as any[];

  const statCards = [
    { label: "Total payments", value: formatCurrency(stats.totalPayments) },
    { label: "Review requests", value: String(stats.reviewRequests) },
    { label: "Completed reviews", value: String(stats.completedReviews) },
  ];

  return (
    <div className="space-y-8">
      <section className="border-b border-black/8 pb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Overview</p>
        <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-black tracking-tight text-neutral-950">What happened lately.</h1>
            <p className="mt-4 text-base leading-7 text-neutral-600">
              See payment volume, review activity, and your latest jobs without digging through extra UI.
            </p>
          </div>
          <Link
            href="/dashboard/jobs/new"
            className="inline-flex items-center justify-center rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Create payment request
          </Link>
        </div>
      </section>

      <section className="grid gap-6 border-b border-black/8 pb-8 md:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label}>
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-3 text-4xl font-black tracking-tight text-neutral-950">{card.value}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-black/8 pb-5">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">Recent jobs</h2>
            <p className="mt-1 text-sm text-neutral-500">Track payment status and review readiness.</p>
          </div>
          <Link href="/dashboard/jobs" className="text-sm font-medium text-[var(--brand-accent)]">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto pt-2">
          <table className="min-w-full text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th className="py-4 pr-6 font-medium">Customer</th>
                <th className="py-4 pr-6 font-medium">Service</th>
                <th className="py-4 pr-6 font-medium">Amount</th>
                <th className="py-4 pr-6 font-medium">Payment</th>
                <th className="py-4 pr-6 font-medium">Review</th>
                <th className="py-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => (
                <tr key={job.id} className="border-t border-black/6">
                  <td className="py-4 pr-6">
                    <Link href={`/dashboard/jobs/${job.id}`} className="font-medium text-neutral-950 hover:text-[var(--brand-accent)]">
                      {job.customer.name}
                    </Link>
                    <p className="mt-1 text-xs text-neutral-500">{job.customer.email}</p>
                  </td>
                  <td className="py-4 pr-6 text-neutral-700">{job.serviceType}</td>
                  <td className="py-4 pr-6 text-neutral-700">{formatCurrency(job.amountCents)}</td>
                  <td className="py-4 pr-6 text-neutral-700">{job.payments[0]?.status ?? job.status}</td>
                  <td className="py-4 pr-6 text-neutral-700">{job.reviewGenerations[0]?.status ?? "Pending"}</td>
                  <td className="py-4 text-neutral-500">{formatDate(job.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
