import { createClient } from "@/lib/supabase/server";
import { LoginFormData } from "@/lib/validations/auth";

export async function loginWithEmailPassword(data: LoginFormData) {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    console.error('Login failed:', error);
    return { success: false, error: 'Invalid login credentials' };
  }

  // Trigger login notification
  if (authData?.user) {
    const firstName = authData.user.user_metadata?.first_name || "User";
    const lastName = authData.user.user_metadata?.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();
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

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getAuthenticatedUserWithRoles() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles, branch_id')
    .eq('id', user.id)
    .single();

  return {
    ...user,
    roles: profile?.roles || [],
    branch_id: profile?.branch_id || null,
  };
}
