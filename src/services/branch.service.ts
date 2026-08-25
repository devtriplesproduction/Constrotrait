import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "./auth.service";
import { BranchFormData } from "@/lib/validations/branch";
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
      .select("id, name, code, address, is_active, created_at, updated_at")
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
        is_active: data.is_active,
      })
      .select("id, name, code, address, is_active, created_at, updated_at")
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
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, name, code, address, is_active, created_at, updated_at")
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
      .select("id, name, code, address, is_active, created_at, updated_at")
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
