import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResultsEntry } from "@/components/modules/results/ResultsEntry";
import { listTestsForResultsAction } from "@/actions/test-result.actions";

export default async function ResultsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const res = await listTestsForResultsAction();
  return (
    <div className="p-6">
      <ResultsEntry initialTests={res.success ? res.data || [] : []} loadError={!res.success ? res.error : null} />
    </div>
  );
}
