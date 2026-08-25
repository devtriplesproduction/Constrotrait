
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { OnboardFormData } from "@/lib/validations/onboard";
import { getAuthenticatedUser, getAuthenticatedUserWithRoles } from "./auth.service";
import { canManageEmployees, isSuperAdmin, isBranchManager, isHR } from "@/config/roles";
import { Json } from "@/types/database";

export async function onboardEmployee(data: OnboardFormData) {
  try {
    const currentUser = await getAuthenticatedUserWithRoles();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    if (!canManageEmployees(currentUser.roles)) {
      return { success: false, error: "Insufficient permissions to onboard employees" };
    }

    const isSuperAdminUser = isSuperAdmin(currentUser.roles);
    const isBranchManagerUser = isBranchManager(currentUser.roles);
    const isHRUser = isHR(currentUser.roles);

    if (!isSuperAdminUser) {
      if (data.roles.includes("SUPER_ADMIN") || data.roles.includes("BRANCH_MANAGER_ADMINISTRATIVE")) {
        return { success: false, error: "Insufficient permissions to assign privileged roles." };
      }
    }

    // Admin client is genuinely required here to:
    // 1. Create the Auth user (since normal users cannot directly insert into auth.users)
    // 2. Rollback the Auth user if profile insertion fails
    const supabaseAdmin = createAdminClient();
    const isActive = ['Probation', 'Confirmed'].includes(data.status as string);

    let targetBranchId = currentUser.branch_id;

    if (isSuperAdminUser) {
      if (data.branch_id) {
        // Validate the explicitly provided branch using regular authenticated client
        const supabase = await createClient();
        const { data: branchData } = await supabase
          .from("branches")
          .select("is_active")
          .eq("id", data.branch_id)
          .maybeSingle();

        if (!branchData) {
          return { success: false, error: "The selected branch does not exist." };
        }
        if (!branchData.is_active) {
          return { success: false, error: "The selected branch is inactive." };
        }
        targetBranchId = data.branch_id;
      } else {
        targetBranchId = null;
      }
    }

    // If branch manager or HR, they can ONLY onboard into their own branch.
    if ((isBranchManagerUser || isHRUser) && !isSuperAdminUser && !targetBranchId) {
       return { success: false, error: "Managers and HR must have an assigned branch to onboard employees." };
    }

    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.first_name, last_name: data.last_name },
      app_metadata: { is_active: isActive, branch_id: targetBranchId },
    });

    if (authError) {
      console.error("Auth user creation failed:", authError);
      return { success: false, error: "Failed to create user account" };
    }

    const userId = authUser.user.id;
    
    // We can now use the regular authenticated client to insert the profile
    // Thanks to the new RLS policy for INSERT on public.profiles
    const supabase = await createClient();

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      branch_id: targetBranchId,
      phone_number: data.phone_number || null,
      employee_id: data.employee_id,
      joining_date: data.joining_date,
      status: data.status,
      is_active: isActive,
      roles: data.roles,
      department: data.department,
      designation: data.designation,
      dob: data.dob || null,
      gender: data.gender || null,
      personal_email: data.personal_email || null,
      residential_address: data.address || null,
      emergency_contact_name: data.emergency_name || null,
      emergency_contact_relation: data.emergency_relationship || null,
      emergency_contact_number: data.emergency_phone || null,
      profile_photo: data.profile_photo || null,
      employment_type: data.employment_type || null,
      salary: data.salary || 0,
      experience: data.experience || 0,
      documents: (data.documents || []) as Json,
    });

    if (profileError) {
      // Rollback auth user creation
      console.error("Profile creation failed:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      
      // Handle Unique Constraint Violation for employee_id or email
      if (profileError.code === '23505') {
        if (profileError.message.includes('employee_id')) {
          return { success: false, error: `Employee ID ${data.employee_id} is already in use.` };
        }
        if (profileError.message.includes('email')) {
          return { success: false, error: `Email ${data.email} is already in use.` };
        }
        return { success: false, error: "A unique constraint was violated. (Check Employee ID or Email)." };
      }
      
      return { success: false, error: "Failed to create user profile" };
    }

    return { 
      success: true, 
      data: { id: userId, email: data.email }, 
      message: `Employee ${data.first_name} onboarded successfully.` 
    };
  } catch (err: unknown) {
    console.error("Onboarding Failure:", err);
    return { success: false, error: "Provisioning failed" };
  }
}

export async function getAllEmployees(options?: { compact?: boolean }) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("roles, branch_id")
      .eq("id", currentUser.id)
      .single();

    const isSuperAdmin = profile?.roles?.includes("SUPER_ADMIN");
    const isBranchManager = profile?.roles?.includes("BRANCH_MANAGER_ADMINISTRATIVE");
    const isHR = profile?.roles?.includes("HR");
    const isAdminInwardCRE = profile?.roles?.includes("ADMIN_INWARD_CRE");

    if (!isSuperAdmin && !isBranchManager && !isHR && !isAdminInwardCRE) {
      // Return only their own profile if not admin/hr, or empty list
      if (options?.compact) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, employee_id")
          .eq("id", currentUser.id);
        if (error) {
          console.error("Database query failed:", error);
          return { success: false, error: "Failed to fetch employees" };
        }
        return { success: true, data };
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name, phone_number, employee_id, department, designation, joining_date, status, is_active, created_at, updated_at, roles, dob, gender, salary, experience, employment_type, profile_photo, documents, personal_email, residential_address, emergency_contact_name, emergency_contact_relation, emergency_contact_number, branch_id, deleted_at")
          .eq("id", currentUser.id);
        if (error) {
          console.error("Database query failed:", error);
          return { success: false, error: "Failed to fetch employees" };
        }
        return { success: true, data };
      }
    }

    if (options?.compact) {
      let query = supabase
        .from("profiles")
        .select("id, first_name, last_name, employee_id")
        .order("first_name", { ascending: true });
        
      if (!isSuperAdmin && (isBranchManager || isHR || isAdminInwardCRE)) {
        query = query.eq("branch_id", profile?.branch_id as string);
      }

      const { data, error } = await query;
        
      if (error) {
        console.error("Database query failed:", error);
        return { success: false, error: "Failed to fetch employees" };
      }
      return { success: true, data };
    } else {
      let query = supabase
        .from("profiles")
        .select("id, email, first_name, last_name, phone_number, employee_id, department, designation, joining_date, status, is_active, created_at, updated_at, roles, dob, gender, salary, experience, employment_type, profile_photo, documents, personal_email, residential_address, emergency_contact_name, emergency_contact_relation, emergency_contact_number, branch_id, deleted_at")
        .order("created_at", { ascending: false });

      if (!isSuperAdmin && (isBranchManager || isHR || isAdminInwardCRE)) {
        query = query.eq("branch_id", profile?.branch_id as string);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Database query failed:", error);
        return { success: false, error: "Failed to fetch employees" };
      }
      return { success: true, data };
    }
  } catch (err: unknown) {
    console.error("Failed to fetch employees:", err);
    return { success: false, error: "Failed to fetch employees" };
  }
}

export async function getCurrentUserProfile() {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, roles, department, dob")
      .eq("id", currentUser.id)
      .single();

    if (error) {
      console.error("Failed to fetch user profile:", error);
      return { success: false, error: "Failed to fetch user profile" };
    }
    return { success: true, data };
  } catch (err: unknown) {
    console.error("Failed to fetch user profile:", err);
    return { success: false, error: "Failed to fetch user profile" };
  }
}

export async function getTodayBirthdays() {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_today_birthdays");

    if (error) {
      console.error("Failed to fetch today birthdays:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return { success: false, error: "Failed to fetch today birthdays" };
    }

    return { success: true, data };
  } catch (err: unknown) {
    console.error("Failed to fetch today birthdays:", err);
    return { success: false, error: "Failed to fetch today birthdays" };
  }
}


