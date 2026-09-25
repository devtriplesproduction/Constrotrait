import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageJobAssignments } from "@/config/roles";
import { JobAssignmentsContent } from "@/components/modules/job-assignments/JobAssignmentsContent";
import { getActiveBranchesAction } from "@/actions/branch.actions";
import { getAssignmentsAction, getMyAssignmentsAction } from "@/actions/job-assignment.actions";
import { getAllEmployeesAction } from "@/actions/employee.actions";

export default async function JobAssignmentsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single();

  const roles = profile?.roles || [];
  const isManager = canManageJobAssignments(roles);

  const defaultTab = isManager ? "list" : "my";
  const tab = typeof searchParams.tab === "string" ? searchParams.tab : defaultTab;

  if (!isManager && tab !== "my") {
    redirect("/job-assignments?tab=my");
  }

  let branches: any[] = [];
  let assignments: any[] = [];
  let employees: any[] = [];

  if (isManager) {
    const [branchesRes, assignmentsRes, employeesRes] = await Promise.all([
      getActiveBranchesAction(),
      getAssignmentsAction(),
      getAllEmployeesAction()
    ]);
    branches = branchesRes.success ? (branchesRes.data || []) : [];
    assignments = assignmentsRes.success ? (assignmentsRes.data || []) : [];
    employees = employeesRes.success ? (employeesRes.data || []) : [];
  } else {
    const assignmentsRes = await getMyAssignmentsAction(user.id);
    assignments = assignmentsRes.success ? (assignmentsRes.data || []) : [];
  }

  return (
    <div className="p-6">
      <JobAssignmentsContent 
        initialTab={tab}
        isManager={isManager}
        userId={user.id}
        branches={branches}
        assignments={assignments}
        employees={employees}
      />
    </div>
  );
}
