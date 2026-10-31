import { redirect } from "next/navigation";

export default async function QuotationReviseRedirect({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolved = await Promise.resolve(params);
  redirect(`/accounting/quotations/new?revise=${resolved.id}`);
}
