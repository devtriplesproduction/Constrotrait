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

  if (!isManager && tab !== "my" && tab !== "schedule") {
    redirect("/job-assignments?tab=my");
  }

  const [branchesRes, assignmentsRes, employeesRes] = await Promise.all([
    getActiveBranchesAction(),
    getAssignmentsAction(),
    getAllEmployeesAction()
  ]);

  const branches = branchesRes.success ? (branchesRes.data || []) : [];
  const assignments = assignmentsRes.success ? (assignmentsRes.data || []) : [];
  const employees = employeesRes.success ? (employeesRes.data || []) : [];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
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
