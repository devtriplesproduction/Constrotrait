import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canViewAccounting, canManageAccountingTransactions } from "@/config/roles";
import { redirect } from "next/navigation";
import { getQuotationFormData } from "@/services/accounting.service";
import { QuotationFormPageClient } from "@/components/modules/accounting/quotations/QuotationFormPageClient";

export const metadata = {
  title: "New Quotation | ConstroTrait Accounting",
  description: "Create or revise laboratory testing commercial quotations with authorized terms and conditions.",
};

export const dynamic = "force-dynamic";

interface QuotationNewPageProps {
  searchParams?: Promise<{
    revise?: string;
    quotation_id?: string;
    id?: string;
    return_url?: string;
  }> | {
    revise?: string;
    quotation_id?: string;
    id?: string;
    return_url?: string;
  };
}

export default async function NewQuotationPage({ searchParams }: QuotationNewPageProps) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || (!canViewAccounting(user.roles) && !canManageAccountingTransactions(user.roles))) {
    redirect("/dashboard");
  }

  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const reviseId = resolvedParams.revise || resolvedParams.quotation_id || resolvedParams.id;
  const returnUrl = resolvedParams.return_url || "/accounting/quotations";

  const result = await getQuotationFormData(user.branch_id || undefined, reviseId || undefined);

  const data = result.success && result.data ? result.data : {
    clients: [],
    projects: [],
    templates: [],
    quotation: null,
    testMasters: [],
  };

  return (
    <div className="w-full">
      <QuotationFormPageClient
        initialClients={data.clients || []}
        initialProjects={data.projects || []}
        initialTemplates={data.templates || []}
        revisingQuotation={data.quotation}
        testMasters={data.testMasters || []}
        returnUrl={returnUrl}
      />
    </div>
  );
}
