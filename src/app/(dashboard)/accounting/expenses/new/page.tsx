import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canViewAccounting, canManageAccountingTransactions } from "@/config/roles";
import { redirect } from "next/navigation";
import { getExpenseFormData } from "@/services/accounting.service";
import { RecordExpensePageClient } from "@/components/modules/accounting/expenses/RecordExpensePageClient";

export const metadata = {
  title: "Record Expense | ConstroTrait Accounting",
  description: "Record and allocate operational testing expenses, in-house lab costs, and company overheads.",
};

export const dynamic = "force-dynamic";

interface ExpenseNewPageProps {
  searchParams?: Promise<{
    inward_id?: string;
    test_id?: string;
    type?: string;
    return_url?: string;
  }> | {
    inward_id?: string;
    test_id?: string;
    type?: string;
    return_url?: string;
  };
}

export default async function RecordExpensePage({ searchParams }: ExpenseNewPageProps) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || (!canViewAccounting(user.roles) && !canManageAccountingTransactions(user.roles))) {
    redirect("/dashboard");
  }

  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const inwardId = resolvedParams.inward_id;

  const result = await getExpenseFormData(user.branch_id || undefined, inwardId || undefined);

  const data = result.success && result.data ? result.data : {
    accounts: [],
    categories: [],
    projects: [],
    inwards: [],
    specificInward: null,
  };

  return (
    <div className="w-full">
      <RecordExpensePageClient
        initialInwards={data.inwards || []}
        categories={data.categories || []}
        accounts={data.accounts || []}
        projects={data.projects || []}
        initialInward={data.specificInward}
      />
    </div>
  );
}
