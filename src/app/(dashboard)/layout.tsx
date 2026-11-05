
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUserProfileAction, getTodayBirthdaysAction } from "@/actions/employee.actions";
import { getTodayAssignedTestsAction } from "@/actions/job-assignment.actions";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { BirthdayNotifier } from "@/components/modules/employees/BirthdayNotifier";
import { TestAssignmentNotifier } from "@/components/modules/employees/TestAssignmentNotifier";
import { canViewAllBirthdays, isTestEngineer, canManageJobAssignments } from "@/config/roles";

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

  const rawRoles = currentUserProfile?.roles || user.app_metadata?.roles || [];
  const roles = Array.from(new Set(rawRoles.filter(Boolean))) as string[];

  const cookieStore = await cookies();
  const activeRoleCookie = cookieStore.get("active_role")?.value;
  const activeRole = (activeRoleCookie && roles.includes(activeRoleCookie))
    ? activeRoleCookie
    : (roles[0] || "UNKNOWN");

  // Parallelize secondary layout notifications (birthdays and today's test assignments)
  const shouldFetchBirthdays = canViewAllBirthdays([activeRole]);
  const shouldFetchTodayTests = isTestEngineer(roles) || canManageJobAssignments(roles);

  const [birthdaysRes, todayTestsRes] = await Promise.all([
    shouldFetchBirthdays ? getTodayBirthdaysAction() : Promise.resolve({ data: [] }),
    shouldFetchTodayTests ? getTodayAssignedTestsAction(user.id) : Promise.resolve({ data: [] }),
  ]);

  const todayBirthdays = ('data' in birthdaysRes && birthdaysRes.data) ? birthdaysRes.data : [];
  const todayTests = ('data' in todayTestsRes && todayTestsRes.data) ? todayTestsRes.data : [];

  const branchName = currentUserProfile?.branches?.name || "";

  return (
    <ClientLayout user={user} role={activeRole} roles={roles} branchName={branchName}>
      <BirthdayNotifier currentUserProfile={currentUserProfile} todayBirthdays={todayBirthdays} />
      <TestAssignmentNotifier currentUserProfile={currentUserProfile} todayTests={todayTests} />
      {children}
    </ClientLayout>
  );
}
