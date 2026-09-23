import { createClient } from "@/utils/supabase/server";
import { AppRole, canManageJobAssignments } from "@/config/roles";

export class TeamService {
  /**
   * Check if the user has permission to manage teams
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
      throw new Error("Insufficient permissions to manage teams");
    }

    return user;
  }

  static async getTeams() {
    const supabase = createClient();
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
    const supabase = createClient();
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
    const supabase = createClient();
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
    const supabase = createClient();
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
    const supabase = createClient();
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
