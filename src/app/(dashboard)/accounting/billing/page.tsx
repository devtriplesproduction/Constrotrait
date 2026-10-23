import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canViewAccounting } from "@/config/roles";
import { redirect } from "next/navigation";
import { AccountingClient } from "@/components/modules/accounting/AccountingClient";
import { getAccountingDashboard } from "@/services/accounting.service";

export const metadata = {
  title: "Billings & Collection | ConstroTrait",
  description: "Manage client invoices, inward receipts, and expenses.",
};

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ subtab?: string }> | { subtab?: string };
}) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : {};
  const subtab = resolvedSearchParams?.subtab;

  const dashboard = await getAccountingDashboard();

  return (
    <div className="w-full space-y-6">
      <AccountingClient
        initialData={dashboard.success ? dashboard.data : null}
        activeTab="billing"
        initialSubTab={subtab}
      />
    </div>
  );
}
