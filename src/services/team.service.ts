import { createClient } from "@/lib/supabase/server";
import { AppRole, canManageJobAssignments } from "@/config/roles";

export class TeamService {
  /**
   * Check if the user has permission to manage teams
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
      throw new Error("Insufficient permissions to manage teams");
    }

    return user;
  }

  static async getTeams() {
    const supabase = await createClient();
    await this.checkPermission(supabase);

    const { data, error } = await supabase
      .from("teams")
      .select(`
        *,
        team_members (
          id,
          employee_id,
          profiles!inner (
            id,
            first_name,
            last_name
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching teams:", error);
      throw new Error(error.message);
    }
    return data;
  }

  static async createTeam(data: { name: string; description?: string; branch_id?: string }) {
    const supabase = await createClient();
    const user = await this.checkPermission(supabase);

    const { data: team, error } = await supabase
      .from("teams")
      .insert([
        {
          name: data.name,
          description: data.description,
          branch_id: data.branch_id,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating team:", error);
      throw new Error(error.message);
    }
    return team;
  }

  static async updateTeam(id: string, data: { name?: string; description?: string; is_active?: boolean }) {
    const supabase = await createClient();
    await this.checkPermission(supabase);

    const { data: team, error } = await supabase
      .from("teams")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating team:", error);
      throw new Error(error.message);
    }
    return team;
  }

  static async addTeamMember(teamId: string, employeeId: string) {
    const supabase = await createClient();
    await this.checkPermission(supabase);

    const { data, error } = await supabase
      .from("team_members")
      .insert([
        {
          team_id: teamId,
          employee_id: employeeId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error adding team member:", error);
      throw new Error(error.message);
    }
    return data;
  }

  static async removeTeamMember(teamId: string, employeeId: string) {
    const supabase = await createClient();
    await this.checkPermission(supabase);

    const { error } = await supabase
      .from("team_members")
      .delete()
      .match({ team_id: teamId, employee_id: employeeId });

    if (error) {
      console.error("Error removing team member:", error);
      throw new Error(error.message);
    }
    return true;
  }
}
