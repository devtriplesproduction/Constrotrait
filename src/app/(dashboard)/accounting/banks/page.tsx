import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canViewAccounting } from "@/config/roles";
import { redirect } from "next/navigation";
import { AccountingClient } from "@/components/modules/accounting/AccountingClient";
import { getAccountingDashboard } from "@/services/accounting.service";

export const metadata = {
  title: "Bank & Cash Accounts | ConstroTrait",
  description: "Track bank accounts, cash accounts, and ledger balances.",
};

export const dynamic = "force-dynamic";

export default async function BanksPage() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) {
    redirect("/dashboard");
  }

  const dashboard = await getAccountingDashboard();

  return (
    <div className="w-full space-y-6">
      <AccountingClient initialData={dashboard.success ? dashboard.data : null} activeTab="banks" />
    </div>
  );
}
