import { createClient } from "@/lib/supabase/server";
import { AppRole, canManageJobAssignments } from "@/config/roles";

export class JobAssignmentService {
  /**
   * Check if the user has permission to manage assignments
   */
  private static async checkPermission(supabase: any) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Failed to verify permissions");

    if (!canManageJobAssignments(profile.roles)) {
      throw new Error("Insufficient permissions to manage job assignments");
    }

    return user;
  }

  static async getAssignments(filters?: { team_id?: string; employee_id?: string; status?: string }) {
    const supabase = await createClient();
    await this.checkPermission(supabase);

    let query = supabase
      .from("job_assignments")
      .select(`
        *,
        job_entry_tests!inner (
          id,
          uid,
          test_master ( component_parameter, specific_test, test_method )
        ),
        teams ( id, name, team_members(employee_id) ),
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

  static async getMyAssignments(userId?: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");
    
    const actualUserId = user.id;

    const { data: userTeams } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("employee_id", actualUserId);
      
    const teamIds = userTeams?.map(t => t.team_id) || [];

    let query = supabase
      .from("job_assignments")
      .select(`
        *,
        job_entry_tests!inner (
          id,
          uid,
          test_master ( component_parameter, specific_test, test_method )
        ),
        teams ( id, name, team_members(employee_id) ),
        assigned_to_profile:profiles!job_assignments_assigned_to_fkey ( id, first_name, last_name ),
        assigned_by_profile:profiles!job_assignments_assigned_by_fkey ( id, first_name, last_name )
      `)
      .order("created_at", { ascending: false });

    if (teamIds.length > 0) {
      query = query.or(`assigned_to.eq.${actualUserId},team_id.in.(${teamIds.join(',')})`);
    } else {
      query = query.eq("assigned_to", actualUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching my assignments:", error);
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
    const supabase = await createClient();
    const user = await this.checkPermission(supabase);

    if (!data.team_id && !data.assigned_to) {
      throw new Error("Must provide either a team_id or an assigned_to employee.");
    }

    // Resolve job_entry_test_id if it's a UID
    let actualJobEntryTestId = data.job_entry_test_id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actualJobEntryTestId)) {
      const { data: jet, error: jetError } = await supabase
        .from("job_entry_tests")
        .select("id")
        .eq("uid", actualJobEntryTestId)
        .maybeSingle();
      if (jetError || !jet) throw new Error(`Could not find job card with UID ${actualJobEntryTestId}`);
      actualJobEntryTestId = jet.id;
    }

    // Upsert or insert depending on if we want to allow re-assignment by creating new or updating.
    // The requirement says "One job card can have one active assignment (or allow reassign with history – prefer simple: one active)"
    // Let's see if there is an existing assignment
    const { data: existing, error: existingError } = await supabase
      .from("job_assignments")
      .select("id")
      .eq("job_entry_test_id", actualJobEntryTestId)
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
            job_entry_test_id: actualJobEntryTestId,
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
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Failed to verify permissions");

    const isManager = canManageJobAssignments(profile.roles);

    const { data: assignment, error: assignmentError } = await supabase
      .from("job_assignments")
      .select("*, teams(team_members(employee_id))")
      .eq("id", id)
      .single();

    if (assignmentError || !assignment) throw new Error("Assignment not found");

    let canUpdate = isManager;
    if (!canUpdate) {
      if (assignment.assigned_to === user.id) {
        canUpdate = true;
      } else if (assignment.teams?.team_members?.some((m: any) => m.employee_id === user.id)) {
        canUpdate = true;
      }
    }

    if (!canUpdate) {
      throw new Error("Insufficient permissions to update this assignment");
    }

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
