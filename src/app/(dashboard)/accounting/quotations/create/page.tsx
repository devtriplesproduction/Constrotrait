import { redirect } from "next/navigation";

export default async function CreateQuotationRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const resolved = searchParams ? await Promise.resolve(searchParams) : {};
  const query = new URLSearchParams(resolved).toString();
  redirect(`/accounting/quotations/new${query ? `?${query}` : ""}`);
}
