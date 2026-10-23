import { redirect } from "next/navigation";

export default function ReceiptsPage() {
  redirect("/accounting/billing?subtab=receipts");
}

