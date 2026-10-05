
import { redirect } from "next/navigation";
import { getCurrentUserProfileAction, getTodayBirthdaysAction } from "@/actions/employee.actions";
import { getMyAssignmentsAction } from "@/actions/job-assignment.actions";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { BirthdayNotifier } from "@/components/modules/employees/BirthdayNotifier";
import { TestAssignmentNotifier } from "@/components/modules/employees/TestAssignmentNotifier";
import { canViewAllBirthdays } from "@/config/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user profile and authenticated user in a single request
  const profileRes = await getCurrentUserProfileAction();
  const currentUserProfile = ('data' in profileRes && profileRes.data) ? profileRes.data : null;
  const user = ('user' in profileRes && profileRes.user) ? profileRes.user : null;

  if (!user || !currentUserProfile) {
    redirect("/login");
  }

  const roles = currentUserProfile?.roles || user.app_metadata?.roles || [];
  const role = roles[0] || "UNKNOWN";

  // Only fetch birthdays if the user has permission
  let todayBirthdays: Array<{ id: string; first_name: string; last_name: string }> = [];
  if (canViewAllBirthdays(roles)) {
    const birthdaysRes = await getTodayBirthdaysAction();
    todayBirthdays = ('data' in birthdaysRes && birthdaysRes.data) ? birthdaysRes.data : [];
  }

  // Fetch tests assigned to user that are scheduled for today
  let todayTests: any[] = [];
  const assignmentsRes = await getMyAssignmentsAction(user.id);
  if (assignmentsRes.success && assignmentsRes.data) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    todayTests = assignmentsRes.data.filter((a: any) => {
      const constraintDate = a.job_entry_tests?.date_of_testing || a.due_date;
      if (!constraintDate) return false;
      const due = new Date(constraintDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime();
    });
  }

  const branchName = currentUserProfile?.branches?.name || "";

  return (
    <ClientLayout user={user} role={role} branchName={branchName}>
      <BirthdayNotifier currentUserProfile={currentUserProfile} todayBirthdays={todayBirthdays} />
      <TestAssignmentNotifier currentUserProfile={currentUserProfile} todayTests={todayTests} />
      {children}
    </ClientLayout>
  );
}
