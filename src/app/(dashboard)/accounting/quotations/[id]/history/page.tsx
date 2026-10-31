import { redirect } from "next/navigation";

export default async function QuotationHistoryRedirect({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolved = await Promise.resolve(params);
  redirect(`/accounting/quotations/${resolved.id}?tab=history`);
}
