import { redirect } from "next/navigation";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageJobAssignments } from "@/config/roles";
import { JobAssignmentsContent } from "@/components/modules/job-assignments/JobAssignmentsContent";
import { getActiveBranchesAction } from "@/actions/branch.actions";
import { getAssignmentsAction, getMyAssignmentsAction } from "@/actions/job-assignment.actions";
import { getAllEmployeesAction } from "@/actions/employee.actions";

export default async function JobAssignmentsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const user = await getAuthenticatedUserWithRoles();

  if (!user) redirect("/login");

  const roles = user.allRoles;
  const activeRole = user.activeRole;

  const isManager = canManageJobAssignments([activeRole]);

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
        userRoles={[activeRole]}
        branches={branches}
        assignments={assignments}
        employees={employees}
      />
    </div>
  );
}