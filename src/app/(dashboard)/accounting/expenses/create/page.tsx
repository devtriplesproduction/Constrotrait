import { redirect } from "next/navigation";

export default async function CreateExpenseRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const resolved = searchParams ? await Promise.resolve(searchParams) : {};
  const query = new URLSearchParams(resolved).toString();
  redirect(`/accounting/expenses/new${query ? `?${query}` : ""}`);
}
