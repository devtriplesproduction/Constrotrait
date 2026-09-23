import { createClient } from "@/utils/supabase/server";
import { AppRole, canManageJobAssignments } from "@/config/roles";

export class JobAssignmentService {
  /**
   * Check if the user has permission to manage assignments
   */
  private static async checkPermission(supabase: any) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) throw new Error("Failed to verify permissions");

    const roles = rolesData.map((r: any) => r.role);
    if (!canManageJobAssignments(roles)) {
      throw new Error("Insufficient permissions to manage job assignments");
    }

    return user;
  }

  static async getAssignments(filters?: { team_id?: string; employee_id?: string; status?: string }) {
    const supabase = createClient();
    await this.checkPermission(supabase);

    let query = supabase
      .from("job_assignments")
      .select(`
        *,
        job_entry_tests!inner (
          id,
          uid,
          test_master ( name )
        ),
        teams ( id, name ),
        assigned_to_profile:profiles!job_assignments_assigned_to_fkey ( id, first_name, last_name ),
        assigned_by_profile:profiles!job_assignments_assigned_by_fkey ( id, first_name, last_name )
      `)
      .order("created_at", { ascending: false });

    if (filters?.team_id) query = query.eq("team_id", filters.team_id);
    if (filters?.employee_id) query = query.eq("assigned_to", filters.employee_id);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching job assignments:", error);
      throw new Error(error.message);
    }
    return data;
  }

  static async assignJobCard(data: {
    job_entry_test_id: string;
    team_id?: string;
    assigned_to?: string;
    due_date?: string;
    notes?: string;
  }) {
    const supabase = createClient();
    const user = await this.checkPermission(supabase);

    if (!data.team_id && !data.assigned_to) {
      throw new Error("Must provide either a team_id or an assigned_to employee.");
    }

    // Upsert or insert depending on if we want to allow re-assignment by creating new or updating.
    // The requirement says "One job card can have one active assignment (or allow reassign with history – prefer simple: one active)"
    // Let's see if there is an existing assignment
    const { data: existing, error: existingError } = await supabase
      .from("job_assignments")
      .select("id")
      .eq("job_entry_test_id", data.job_entry_test_id)
      .maybeSingle();

    if (existingError) {
      throw new Error("Error checking existing assignments");
    }

    let result;
    if (existing) {
      // Update existing
      const { data: updated, error } = await supabase
        .from("job_assignments")
        .update({
          team_id: data.team_id || null,
          assigned_to: data.assigned_to || null,
          assigned_by: user.id,
          due_date: data.due_date,
          notes: data.notes,
          status: 'assigned', // reset status on reassign
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      result = updated;
    } else {
      // Create new
      const { data: inserted, error } = await supabase
        .from("job_assignments")
        .insert([
          {
            job_entry_test_id: data.job_entry_test_id,
            team_id: data.team_id || null,
            assigned_to: data.assigned_to || null,
            assigned_by: user.id,
            due_date: data.due_date,
            notes: data.notes,
            status: 'assigned'
          },
        ])
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      result = inserted;
    }

    return result;
  }

  static async updateAssignmentStatus(id: string, status: string) {
    const supabase = createClient();
    // we might want employees to be able to update their own, but for now we enforce the same manager check
    await this.checkPermission(supabase);

    const { data, error } = await supabase
      .from("job_assignments")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating assignment status:", error);
      throw new Error(error.message);
    }
    return data;
  }
}
