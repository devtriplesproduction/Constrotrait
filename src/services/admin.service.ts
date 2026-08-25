import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "./auth.service";
import { canManageEmployees } from "@/config/roles";
import { APP_ROLE_KEYS } from "@/config/roles";
import { Database, Json } from "@/types/database";

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function logAdminAudit(
  action: string,
  details: Record<string, unknown> | Json,
  severity: 'info' | 'warning' | 'critical' | 'security',
  targetUserId?: string
) {
  try {
    const currentUser = await getAuthenticatedUser();
    const actorId = currentUser?.id || 'system';
    const actorEmail = currentUser?.email || 'system@constrotrait.com';

    const supabaseAdmin = createAdminClient();
    
    // We assume the activity_logs table exists or will be created. If it doesn't, this will fail gracefully.
    await supabaseAdmin.from('activity_logs').insert({
      user_id: actorId === 'system' ? null : actorId,
      actor_email: actorEmail,
      action,
      details: details as Json,
      severity,
      target_user_id: targetUserId ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Audit log insertion failed:', error);
  }
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    
    // Check permission
    const { data: profile } = await supabaseAdmin.from("profiles").select("roles, email, branch_id").eq("id", currentUser.id).single();
    if (!canManageEmployees(profile?.roles)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data: targetProfile } = await supabaseAdmin.from("profiles").select("email, branch_id").eq("id", userId).maybeSingle();
    
    if (!profile?.roles?.includes("SUPER_ADMIN") && profile?.branch_id !== targetProfile?.branch_id) {
      return { success: false, error: "Unauthorized: Cross-branch operations are not permitted" };
    }

    await supabaseAdmin
      .from('profiles')
      .update({})
      .eq('id', userId);

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { is_active: isActive },
    }).catch(() => null);

    await logAdminAudit(
      isActive ? 'USER_ENABLED' : 'USER_SUSPENDED',
      { email: targetProfile?.email },
      isActive ? 'warning' : 'security',
      userId
    );

    return { success: true };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function offboardEmployee(userId: string) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    
    const { data: profile } = await supabaseAdmin.from("profiles").select("roles, branch_id").eq("id", currentUser.id).single();
    if (!canManageEmployees(profile?.roles)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data: targetProfile } = await supabaseAdmin.from("profiles").select("email, roles, branch_id").eq("id", userId).maybeSingle();
    
    if (!profile?.roles?.includes("SUPER_ADMIN") && profile?.branch_id !== targetProfile?.branch_id) {
      return { success: false, error: "Unauthorized: Cross-branch operations are not permitted" };
    }

    if (targetProfile?.roles?.includes('developer' as never) || targetProfile?.roles?.includes('SUPER_ADMIN')) {
      return { success: false, error: 'Cannot offboard a developer or super admin account' };
    }

    await supabaseAdmin
      .from('profiles')
      .update({})
      .eq('id', userId);

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { is_active: false },
    }).catch(() => null);

    await logAdminAudit(
      'USER_OFFBOARDED',
      { email: targetProfile?.email },
      'critical',
      userId
    );

    return { success: true };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function onboardEmployee(userId: string) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    
    const { data: profile } = await supabaseAdmin.from("profiles").select("roles, branch_id").eq("id", currentUser.id).single();
    if (!canManageEmployees(profile?.roles)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data: targetProfile } = await supabaseAdmin.from("profiles").select("email, roles, branch_id").eq("id", userId).maybeSingle();
    
    if (!profile?.roles?.includes("SUPER_ADMIN") && profile?.branch_id !== targetProfile?.branch_id) {
      return { success: false, error: "Unauthorized: Cross-branch operations are not permitted" };
    }

    await supabaseAdmin
      .from('profiles')
      .update({})
      .eq('id', userId);

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { is_active: true },
    }).catch(() => null);

    await logAdminAudit(
      'USER_ONBOARDED',
      { email: targetProfile?.email },
      'info',
      userId
    );

    return { success: true };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteEmployee(userId: string) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    
    const { data: profile } = await supabaseAdmin.from("profiles").select("roles").eq("id", currentUser.id).single();
    if (!profile?.roles?.includes("SUPER_ADMIN")) {
      return { success: false, error: "Only Super Admins can delete users" };
    }

    const { data: targetProfile } = await supabaseAdmin.from("profiles").select("email, roles, first_name, last_name").eq("id", userId).maybeSingle();
    if (targetProfile?.roles?.includes('developer' as never) || targetProfile?.roles?.includes('SUPER_ADMIN')) {
      return { success: false, error: 'Cannot delete developer or super admin account' };
    }

    // Soft delete
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        is_active: false, 
        status: 'Terminated', 
        deleted_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile archiving failed:', profileError);
      return { success: false, error: 'Profile archiving failed' };
    }

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { is_active: false },
    }).catch(() => null);

    await logAdminAudit(
      'USER_ARCHIVED_SOFT_DELETE',
      { email: targetProfile?.email, name: `${targetProfile?.first_name} ${targetProfile?.last_name}` },
      'warning',
      userId
    );

    return { success: true };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function resetEmployeePassword(userId: string, newPassword: string) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };
    if (!newPassword || newPassword.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

    const supabaseAdmin = createAdminClient();
    
    const { data: profile } = await supabaseAdmin.from("profiles").select("roles, email, branch_id").eq("id", currentUser.id).single();
    if (!canManageEmployees(profile?.roles)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data: targetProfileCheck } = await supabaseAdmin.from("profiles").select("branch_id").eq("id", userId).maybeSingle();
    
    if (!profile?.roles?.includes("SUPER_ADMIN") && profile?.branch_id !== targetProfileCheck?.branch_id) {
      return { success: false, error: "Unauthorized: Cross-branch operations are not permitted" };
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) {
      console.error('Password reset failed:', error);
      return { success: false, error: 'Failed to reset password' };
    }

    await logAdminAudit(
      'EMPLOYEE_PASSWORD_RESET',
      { reset_by: profile?.email || 'system' },
      'security',
      userId
    );

    // Trigger password change notification
    const { data: targetProfile } = await supabaseAdmin.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle();
    if (targetProfile) {
      const firstName = targetProfile.first_name || "User";
      const lastName = targetProfile.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();
      try {
        const { createAdminNotification } = await import("@/services/notification.service");
        await createAdminNotification(`${fullName}'s password was reset.`, "PASSWORD_CHANGE");
      } catch (err) {
        console.error("Failed to send password reset notification:", err);
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getAdminAuditLogs() {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    
    const { data: profile } = await supabaseAdmin.from("profiles").select("roles").eq("id", currentUser.id).single();
    if (!profile?.roles?.includes("SUPER_ADMIN")) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('id, user_id, actor_email, action, details, severity, target_user_id, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateEmployeeRoles(userId: string, newRoles: string[]) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    
    // Check permission of actor
    const { data: profile } = await supabaseAdmin.from("profiles").select("roles, branch_id").eq("id", currentUser.id).single();
    const isActorSuperAdmin = profile?.roles?.includes("SUPER_ADMIN");
    const isActorHR = profile?.roles?.includes("HR");
    const isActorBranchManager = profile?.roles?.includes("BRANCH_MANAGER_ADMINISTRATIVE");

    if (!isActorSuperAdmin && !isActorHR && !isActorBranchManager) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Validate requested roles
    const invalidRoles = newRoles.filter(r => !APP_ROLE_KEYS.includes(r as typeof APP_ROLE_KEYS[number]));
    if (invalidRoles.length > 0) {
      return { success: false, error: `Invalid roles requested: ${invalidRoles.join(', ')}` };
    }

    if (newRoles.includes("SUPER_ADMIN") && !isActorSuperAdmin) {
      return { success: false, error: "Only Super Admins can assign the SUPER_ADMIN role." };
    }

    if (newRoles.includes("BRANCH_MANAGER_ADMINISTRATIVE") && !isActorSuperAdmin) {
      return { success: false, error: "Only Super Admins can assign the BRANCH_MANAGER_ADMINISTRATIVE role." };
    }

    const { data: targetProfile } = await supabaseAdmin.from("profiles").select("email, roles, branch_id").eq("id", userId).maybeSingle();
    if (!targetProfile) return { success: false, error: "User not found" };

    if (!isActorSuperAdmin && profile?.branch_id !== targetProfile.branch_id) {
      return { success: false, error: "Unauthorized: Cross-branch operations are not permitted" };
    }

    // Update profiles
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ roles: newRoles as Database["public"]["Enums"]["user_role"][] })
      .eq('id', userId);
      
    if (updateError) throw updateError;

    // DB Trigger `sync_profile_roles_to_auth` will automatically and atomically 
    // sync `profiles.roles` to `auth.users.raw_app_meta_data->'roles'`.
    
    await logAdminAudit(
      'ROLES_UPDATED',
      { email: targetProfile.email, old_roles: targetProfile.roles, new_roles: newRoles },
      'security',
      userId
    );

    return { success: true };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateEmployeeProfile(userId: string, data: Partial<ProfileUpdate> & { roles?: string[] }) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    
    // Check permission of actor
    const { data: profile } = await supabaseAdmin.from("profiles").select("roles, branch_id").eq("id", currentUser.id).single();
    const isActorSuperAdmin = profile?.roles?.includes("SUPER_ADMIN");
    const isActorHR = profile?.roles?.includes("HR");
    const isActorBranchManager = profile?.roles?.includes("BRANCH_MANAGER_ADMINISTRATIVE");

    if (!isActorSuperAdmin && !isActorHR && !isActorBranchManager) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data: targetProfileCheck } = await supabaseAdmin.from("profiles").select("branch_id").eq("id", userId).maybeSingle();
    
    if (!isActorSuperAdmin && profile?.branch_id !== targetProfileCheck?.branch_id) {
      return { success: false, error: "Unauthorized: Cross-branch operations are not permitted" };
    }

    const newBranchId = isActorSuperAdmin && 'branch_id' in data ? data.branch_id : undefined;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        dob: data.dob || null,
        gender: data.gender || null,
        department: data.department || null,
        employment_type: data.employment_type || null,
        salary: data.salary || 0,
        experience: data.experience || 0,
        joining_date: data.joining_date || null,
        status: data.status || 'active',
        profile_photo: data.profile_photo || null,
        documents: data.documents || [],
        personal_email: data.personal_email || null,
        residential_address: data.residential_address || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_relation: data.emergency_contact_relation || null,
        emergency_contact_number: data.emergency_contact_number || null,
        ...(newBranchId !== undefined && { branch_id: newBranchId }),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (updateError) throw updateError;

    // Optional: Log audit
    await logAdminAudit('PROFILE_UPDATED', { updated_fields: Object.keys(data) }, 'info', userId);

    // If roles changed
    if (data.roles && Array.isArray(data.roles)) {
       await updateEmployeeRoles(userId, data.roles);
    }

    // If status changed to something that should revoke auth access
    if (['suspended', 'Terminated', 'Resigned', 'Inactive', 'Notice Period'].includes(data.status as string)) {
       await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: { is_active: false, ...(newBranchId !== undefined && { branch_id: newBranchId }) } }).catch(() => null);
       await supabaseAdmin.from('profiles').update({}).eq('id', userId);
    } else if (['Probation', 'Confirmed'].includes(data.status as string)) {
       await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: { is_active: true, ...(newBranchId !== undefined && { branch_id: newBranchId }) } }).catch(() => null);
       await supabaseAdmin.from('profiles').update({}).eq('id', userId);
    } else if (newBranchId !== undefined) {
       await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: { branch_id: newBranchId } }).catch(() => null);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getSalaryHikes(employeeId: string) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('salary_hikes')
      .select('id, employee_id, previous_salary, new_salary, effective_date, created_at, created_by')
      .eq('employee_id', employeeId)
      .order('effective_date', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function addSalaryHike(employeeId: string, previousSalary: number, newSalary: number, effectiveDate: string) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    
    // Check permission of actor
    const { data: profile } = await supabaseAdmin.from("profiles").select("roles, branch_id").eq("id", currentUser.id).single();
    const isActorSuperAdmin = profile?.roles?.includes("SUPER_ADMIN");
    const isActorHR = profile?.roles?.includes("HR");
    const isActorBranchManager = profile?.roles?.includes("BRANCH_MANAGER_ADMINISTRATIVE");

    if (!isActorSuperAdmin && !isActorHR && !isActorBranchManager) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data: targetProfileCheck } = await supabaseAdmin.from("profiles").select("branch_id").eq("id", employeeId).maybeSingle();
    
    if (!isActorSuperAdmin && profile?.branch_id !== targetProfileCheck?.branch_id) {
      return { success: false, error: "Unauthorized: Cross-branch operations are not permitted" };
    }

    const { error: insertError } = await supabaseAdmin
        .from('salary_hikes')
        .insert({
          employee_id: employeeId,
          previous_salary: previousSalary,
          new_salary: newSalary,
          effective_date: effectiveDate,
          created_by: currentUser.id
        });
      
    if (insertError) throw insertError;

    // Update profile salary
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({})
      .eq('id', employeeId);

    if (updateError) throw updateError;

    await logAdminAudit('SALARY_HIKE_ADDED', { previousSalary, newSalary, effectiveDate }, 'info', employeeId);

    return { success: true };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}


