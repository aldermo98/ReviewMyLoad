import { DashboardShell } from "@/components/dashboard-shell";
import { requireOrganizationContext } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organization } = await requireOrganizationContext();

  return (
    <DashboardShell businessName={organization.businessName ?? organization.name}>
      {children}
    </DashboardShell>
  );
}
