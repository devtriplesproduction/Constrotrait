
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/services/auth.service";
import { getCurrentUserProfileAction, getTodayBirthdaysAction } from "@/actions/employee.actions";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { BirthdayNotifier } from "@/components/modules/employees/BirthdayNotifier";
import { canViewAllBirthdays } from "@/config/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }
  
  // Fetch user profile first to determine roles
  const profileRes = await getCurrentUserProfileAction();
  const currentUserProfile = ('data' in profileRes && profileRes.data) ? profileRes.data : null;

  const roles = currentUserProfile?.roles || user.app_metadata?.roles || [];
  const role = roles[0] || "UNKNOWN";

  // Only fetch birthdays if the user has permission
  let todayBirthdays: Array<{ id: string; first_name: string; last_name: string }> = [];
  if (canViewAllBirthdays(roles)) {
    const birthdaysRes = await getTodayBirthdaysAction();
    todayBirthdays = ('data' in birthdaysRes && birthdaysRes.data) ? birthdaysRes.data : [];
  }

  return (
    <ClientLayout user={user} role={role}>
      <BirthdayNotifier currentUserProfile={currentUserProfile} todayBirthdays={todayBirthdays} />
      {children}
    </ClientLayout>
  );
}



