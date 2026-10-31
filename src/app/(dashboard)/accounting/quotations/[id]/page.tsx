import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canViewAccounting } from "@/config/roles";
import { redirect, notFound } from "next/navigation";
import { getQuotationById } from "@/services/accounting.service";
import { QuotationDetailPageClient } from "@/components/modules/accounting/quotations/QuotationDetailPageClient";
import type { QuotationData } from "@/components/modules/accounting/quotations/QuotationViewModal";

export const metadata = {
  title: "Commercial Quotation | ConstroTrait",
  description: "View and print official commercial quotation.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export default async function QuotationDetailPage(props: PageProps) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) {
    redirect("/dashboard");
  }

  const { id } = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const initialHistoryOpen = searchParams?.tab === "history";

  const res = await getQuotationById(id);

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <div className="w-full">
      <QuotationDetailPageClient
        quotation={res.data as unknown as QuotationData}
        initialHistoryOpen={initialHistoryOpen}
      />
    </div>
  );
}
