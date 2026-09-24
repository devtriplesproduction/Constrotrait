import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageJobAssignments } from "@/config/roles";
import { JobAssignmentsTabsClient } from "@/components/modules/job-assignments/JobAssignmentsTabsClient";
import { TeamsTab } from "@/components/modules/job-assignments/TeamsTab";
import { AssignJobsTab } from "@/components/modules/job-assignments/AssignJobsTab";
import { AssignmentsListTab } from "@/components/modules/job-assignments/AssignmentsListTab";
import { getTeamsAction } from "@/actions/team.actions";
import { getAssignmentsAction } from "@/actions/job-assignment.actions";
import { getAllEmployeesAction } from "@/actions/employee.actions";

export default async function JobAssignmentsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single();

  const roles = profile?.roles || [];

  if (!canManageJobAssignments(roles)) {
    redirect("/");
  }

  const tab = typeof searchParams.tab === "string" ? searchParams.tab : "teams";

  const [teamsRes, assignmentsRes, employeesRes] = await Promise.all([
    getTeamsAction(),
    getAssignmentsAction(),
    getAllEmployeesAction()
  ]);

  const teams = teamsRes.success ? teamsRes.data : [];
  const assignments = assignmentsRes.success ? assignmentsRes.data : [];
  const employees = employeesRes.success ? employeesRes.data : [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Job Assignments</h1>
        <JobAssignmentsTabsClient activeTab={tab} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {tab === "teams" && (
          <TeamsTab initialTeams={teams} employees={employees} />
        )}
        {tab === "assign" && (
          <AssignJobsTab teams={teams} employees={employees} />
        )}
        {tab === "list" && (
          <AssignmentsListTab assignments={assignments} teams={teams} employees={employees} />
        )}
      </div>
    </div>
  );
}
