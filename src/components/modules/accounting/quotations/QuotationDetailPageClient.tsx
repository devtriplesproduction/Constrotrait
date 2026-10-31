"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { QuotationViewModal, type QuotationData } from "./QuotationViewModal";

interface QuotationDetailPageClientProps {
  quotation: QuotationData;
  initialHistoryOpen?: boolean;
}

export function QuotationDetailPageClient({
  quotation,
  initialHistoryOpen = false,
}: QuotationDetailPageClientProps) {
  const router = useRouter();

  return (
    <QuotationViewModal
      isOpen={true}
      quotation={quotation}
      isStandalone={true}
      initialHistoryOpen={initialHistoryOpen}
      onClose={() => router.push("/accounting/quotations")}
      onRefresh={() => router.refresh()}
      onRevise={(q) => router.push(`/accounting/quotations/new?revise=${q.id}`)}
      onConvertToInward={(q) => router.push(`/clients/new?quotation_id=${q.id}`)}
    />
  );
}
