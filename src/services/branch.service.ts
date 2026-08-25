import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";

export async function getBranches() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("HR") && !user.roles.includes("BRANCH_MANAGER_ADMINISTRATIVE") && !user.roles.includes("ADMIN_INWARD_CRE"))) {
     return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from('branches').select('*').order('name');
  if (error) {
    return { success: false, error: "Failed to fetch branches" };
  }
  return { success: true, data };
}

export async function createBranch(name: string, code: string, address?: string, is_active: boolean = true) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !user.roles.includes("SUPER_ADMIN")) {
    return { success: false, error: "Only Super Admins can manage branches" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from('branches').insert({
    name, code, address, is_active
  }).select().single();

  if (error) {
    return { success: false, error: "Failed to create branch" };
  }
  return { success: true, data };
}

export async function updateBranch(id: string, updates: { name?: string, code?: string, address?: string, is_active?: boolean }) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !user.roles.includes("SUPER_ADMIN")) {
    return { success: false, error: "Only Super Admins can manage branches" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from('branches').update(updates).eq('id', id).select().single();

  if (error) {
    return { success: false, error: "Failed to update branch" };
  }
  return { success: true, data };
}
