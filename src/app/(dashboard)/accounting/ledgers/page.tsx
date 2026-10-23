import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canViewAccounting } from "@/config/roles";
import { redirect } from "next/navigation";
import { AccountingClient } from "@/components/modules/accounting/AccountingClient";
import { getAccountingDashboard, getLedgersData } from "@/services/accounting.service";

export const metadata = {
  title: "Ledgers | ConstroTrait",
  description: "Comprehensive double-entry income ledger, expense ledger, and inward job costing.",
};

export const dynamic = "force-dynamic";

export default async function LedgersPage() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) {
    redirect("/dashboard");
  }

  const [dashboard, ledgers] = await Promise.all([
    getAccountingDashboard(),
    getLedgersData(),
  ]);

  return (
    <div className="w-full space-y-6">
      <AccountingClient
        initialData={dashboard.success ? dashboard.data : null}
        initialLedgersData={ledgers.success ? ledgers.data : null}
        activeTab="ledgers"
      />
    </div>
  );
}
