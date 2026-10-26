import { redirect } from "next/navigation";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canAccessSystemConsole } from "@/config/roles";
import { SystemConsoleManager } from "./components/SystemConsoleManager";

export const metadata = {
  title: "System Console & Database Control | Constrotrait",
  description: "Developer and Super Admin portal for login tracking, device audits, database backups, and data repopulation.",
};

export default async function SystemConsolePage() {
  const user = await getAuthenticatedUserWithRoles();

  if (!user) {
    redirect("/login");
  }

  const allRoles = user.allRoles || user.roles || [];
  if (!canAccessSystemConsole(allRoles)) {
    redirect("/dashboard");
  }

  const currentUser = {
    id: user.id,
    email: user.email || "developer@constrotrait.com",
    name: user.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`.trim()
      : undefined,
    roles: allRoles,
    activeRole: user.activeRole || allRoles[0] || "SUPER_ADMIN",
  };

  return <SystemConsoleManager currentUser={currentUser} />;
}
