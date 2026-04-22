import Link from "next/link";
import { CreditCard, Home, Settings, Sparkles } from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/jobs", label: "Jobs", icon: CreditCard },
  { href: "/dashboard/onboarding", label: "Onboarding", icon: Sparkles },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({
  businessName,
  children,
}: {
  businessName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fcfcf9] text-neutral-950">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="border-b border-black/8 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-neutral-500">ReviewMyLoad</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight">{businessName}</h1>
              <p className="mt-2 text-sm text-neutral-500">Payments first. Review follow-up second.</p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-full border border-black/10 px-4 py-2 text-sm text-neutral-700 transition hover:border-black/30 hover:text-neutral-950"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border-r border-black/8 pr-6">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium text-neutral-500 transition hover:bg-black/4 hover:text-neutral-950"
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
