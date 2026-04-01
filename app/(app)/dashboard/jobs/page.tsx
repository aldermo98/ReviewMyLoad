import Link from "next/link";

import { requireOrganizationContext } from "@/lib/auth/session";
import { getJobsForOrganization } from "@/lib/data/app-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function JobsPage() {
  const { organization } = await requireOrganizationContext();
  const jobs = (await getJobsForOrganization(organization.id)) as any[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Jobs</p>
          <h1 className="mt-3 text-3xl font-semibold">Track payment requests and review readiness.</h1>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          New payment request
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#faf8f4] text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Customer</th>
              <th className="px-6 py-4 font-medium">Service</th>
              <th className="px-6 py-4 font-medium">Amount</th>
              <th className="px-6 py-4 font-medium">Payment link</th>
              <th className="px-6 py-4 font-medium">Review draft</th>
              <th className="px-6 py-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-slate-100">
                <td className="px-6 py-4">
                  <Link href={`/dashboard/jobs/${job.id}`} className="font-medium text-slate-900 hover:text-teal-700">
                    {job.customer.name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">{job.customer.email}</p>
                </td>
                <td className="px-6 py-4">{job.serviceType}</td>
                <td className="px-6 py-4">{formatCurrency(job.amountCents)}</td>
                <td className="px-6 py-4">{job.paymentRequests[0]?.status ?? "Draft"}</td>
                <td className="px-6 py-4">{job.reviewGenerations[0]?.status ?? "Pending"}</td>
                <td className="px-6 py-4 text-slate-500">{formatDate(job.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
