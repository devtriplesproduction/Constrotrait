import { redirect } from "next/navigation";

export default function ExpensesPage() {
  redirect("/accounting/billing?subtab=expenses");
}

