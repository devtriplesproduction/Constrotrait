import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, getAuthenticatedUserWithRoles } from "./auth.service";
import { BranchFormData } from "@/lib/validations/branch";
import { createAdminClient } from "@/lib/supabase/admin";
export async function getActiveBranches() {
  try {
    const supabase = await createClient();
    const currentUser = await getAuthenticatedUser();
    
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("branches")
      .select("id, name, code, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to fetch active branches:", error);
      return { success: false, error: "Failed to fetch active branches" };
    }

    return { success: true, data };
  } catch (err: unknown) {
    console.error("Failed to fetch active branches:", err);
    return { success: false, error: "Failed to fetch active branches" };
  }
}

export async function getBranches() {
  try {
    const supabase = await createClient();
    const currentUser = await getAuthenticatedUser();
    
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("branches")
      .select("id, name, code, address, email, phone, gst_number, is_active, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch branches:", error);
      return { success: false, error: "Failed to fetch branches" };
    }

    return { success: true, data };
  } catch (err: unknown) {
    console.error("Failed to fetch branches:", err);
    return { success: false, error: "Failed to fetch branches" };
  }
}

export async function createBranch(data: BranchFormData) {
  try {
    const supabase = await createClient();
    
    const { data: branch, error } = await supabase
      .from("branches")
      .insert({
        name: data.name,
        code: data.code,
        address: data.address || null,
        email: data.email || null,
        phone: data.phone || null,
        gst_number: data.gst_number || null,
        is_active: data.is_active,
      })
      .select("id, name, code, address, email, phone, gst_number, is_active, created_at, updated_at")
      .single();

    if (error) {
      console.error("Failed to create branch:", error);
      if (error.code === '23505') {
        if (error.message.includes('name')) {
          return { success: false, error: `Branch name '${data.name}' already exists.` };
        }
        if (error.message.includes('code')) {
          return { success: false, error: `Branch code '${data.code}' already exists.` };
        }
        return { success: false, error: "A branch with this name or code already exists." };
      }
      return { success: false, error: "Failed to create branch." };
    }

    return { success: true, data: branch, message: "Branch created successfully." };
  } catch (err: unknown) {
    console.error("Failed to create branch:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function updateBranch(id: string, data: BranchFormData) {
  try {
    const supabase = await createClient();
    
    const { data: branch, error } = await supabase
      .from("branches")
      .update({
        name: data.name,
        code: data.code,
        address: data.address || null,
        email: data.email || null,
        phone: data.phone || null,
        gst_number: data.gst_number || null,
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, name, code, address, email, phone, gst_number, is_active, created_at, updated_at")
      .single();

    if (error) {
      console.error("Failed to update branch:", error);
      if (error.code === '23505') {
        if (error.message.includes('name')) {
          return { success: false, error: `Branch name '${data.name}' already exists.` };
        }
        if (error.message.includes('code')) {
          return { success: false, error: `Branch code '${data.code}' already exists.` };
        }
        return { success: false, error: "A branch with this name or code already exists." };
      }
      return { success: false, error: "Failed to update branch." };
    }

    return { success: true, data: branch, message: "Branch updated successfully." };
  } catch (err: unknown) {
    console.error("Failed to update branch:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function toggleBranchActive(id: string, isActive: boolean) {
  try {
    const supabase = await createClient();
    
    const { data: branch, error } = await supabase
      .from("branches")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, name, code, address, email, phone, gst_number, is_active, created_at, updated_at")
      .single();

    if (error) {
      console.error("Failed to toggle branch status:", error);
      return { success: false, error: "Failed to update branch status." };
    }

    return { 
      success: true, 
      data: branch, 
      message: `Branch ${isActive ? 'activated' : 'deactivated'} successfully.` 
    };
  } catch (err: unknown) {
    console.error("Failed to toggle branch status:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function deleteBranch(id: string) {
  try {
    const supabase = await createClient();
    const currentUser = await getAuthenticatedUserWithRoles();
    
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    if (!currentUser.roles.includes("SUPER_ADMIN")) {
      return { success: false, error: "Only Super Admins can delete branches" };
    }

    const adminId = currentUser.id;
    const supabaseAdmin = createAdminClient();

    // 1. Fetch all employees associated with this branch to clean up their storage files
    const { data: employees, error: empError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("branch_id", id);

    if (empError) {
      console.error("Failed to fetch branch employees:", empError);
      return { success: false, error: "Failed to verify branch employees for cleanup." };
    }

    // 2. Cleanup Storage files (eod_photos, medical-certificates) for these employees
    if (employees && employees.length > 0) {
      const employeeIds = employees.map(emp => emp.id);
      
      // A helper to delete all files in a folder path
      const cleanupUserFolder = async (bucket: string, userId: string) => {
        const { data: files } = await supabaseAdmin.storage.from(bucket).list(userId);
        if (files && files.length > 0) {
          const filePaths = files.map(f => `${userId}/${f.name}`);
          await supabaseAdmin.storage.from(bucket).remove(filePaths);
        }
      };

      for (const empId of employeeIds) {
        await cleanupUserFolder('eod_photos', empId);
        await cleanupUserFolder('medical-certificates', empId);
      }
    }

    // 3. Call the secure RPC to perform transactional deletion
    const { data: rpcResult, error: rpcError } = await supabaseAdmin
      .rpc('delete_branch_transaction', { p_branch_id: id, p_admin_id: adminId });

    if (rpcError) {
      console.error("Failed to execute delete_branch_transaction:", rpcError);
      return { success: false, error: "Database transaction failed during branch deletion." };
    }

    if (rpcResult && !rpcResult.success) {
      return { success: false, error: rpcResult.error || "Failed to delete branch." };
    }

    // Attempt to log audit
    try {
      const { logAdminAudit } = await import("./admin.service");
      await logAdminAudit(
        'BRANCH_DELETED',
        { branch_id: id, deleted_users_count: rpcResult?.deleted_users_count || 0 },
        'critical'
      );
    } catch (e) {
      // Ignore audit log failure
    }

    return { 
      success: true, 
      message: `Branch successfully deleted along with ${rpcResult?.deleted_users_count || 0} associated users.` 
    };
  } catch (err: unknown) {
    console.error("Failed to delete branch:", err);
    return { success: false, error: "An unexpected error occurred during branch deletion." };
  }
}
