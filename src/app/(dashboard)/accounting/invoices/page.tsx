import { redirect } from "next/navigation";

export default function InvoicesPage() {
  redirect("/accounting/billing?subtab=invoices");
}

