import { createClient } from "@/lib/supabase/server";
import { LoginFormData } from "@/lib/validations/auth";
import { cache } from "react";

export async function loginWithEmailPassword(data: LoginFormData) {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    console.error('Login failed:', error);
    try {
      const { headers } = await import("next/headers");
      const headerList = await headers();
      const { recordLoginAudit } = await import("@/services/login-audit.service");
      await recordLoginAudit({
        email: data.email,
        status: "FAILED",
        failureReason: error.message || "Invalid login credentials",
        headers: headerList,
      });
    } catch (auditErr) {
      console.error("Failed to log failed login audit:", auditErr);
    }
    return { success: false, error: 'Invalid login credentials' };
  }

  // Trigger login audit log and notification
  if (authData?.user) {
    const firstName = authData.user.user_metadata?.first_name || "User";
    const lastName = authData.user.user_metadata?.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();

    try {
      const { headers } = await import("next/headers");
      const headerList = await headers();
      const { recordLoginAudit } = await import("@/services/login-audit.service");

      // Query role and profile details
      const { data: profile } = await supabase
        .from("profiles")
        .select("roles, first_name, last_name")
        .eq("id", authData.user.id)
        .maybeSingle();

      const userRoles = (profile?.roles || authData.user.app_metadata?.roles || []) as string[];
      const primaryRole = userRoles[0] || "User";
      const resolvedName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ""}`.trim()
        : fullName;

      await recordLoginAudit({
        userId: authData.user.id,
        email: data.email,
        fullName: resolvedName,
        role: primaryRole,
        status: "SUCCESS",
        headers: headerList,
      });
    } catch (auditErr) {
      console.error("Failed to record login audit log:", auditErr);
    }

    try {
      const { createAdminNotification } = await import("@/services/notification.service");
      await createAdminNotification(`${fullName} logged into the account.`, "LOGIN");
    } catch (err) {
      console.error("Failed to send login notification:", err);
    }
  }

  return { success: true, data: authData };
}

export async function logoutUser() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Logout failed:', error);
    return { success: false, error: 'Failed to logout' };
  }
  
  return { success: true };
}

export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

export const getAuthenticatedUserWithRoles = cache(async () => {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles, branch_id')
    .eq('id', user.id)
    .single();

  const rawRoles = (profile?.roles || []) as string[];
  const allRoles = Array.from(new Set(rawRoles.filter(Boolean)));

  let activeRoleCookie: string | undefined;
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    activeRoleCookie = cookieStore.get("active_role")?.value;
  } catch {
    // Ignore error if invoked in non-request context
  }

  const activeRole = (activeRoleCookie && allRoles.includes(activeRoleCookie))
    ? activeRoleCookie
    : (allRoles[0] || "UNKNOWN");

  return {
    ...user,
    allRoles,
    roles: [activeRole],
    activeRole,
    branch_id: profile?.branch_id || null,
  };
});
