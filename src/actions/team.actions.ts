"use server";

import { revalidatePath } from "next/cache";
import { TeamService } from "@/services/team.service";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageJobAssignments } from "@/config/roles";

export async function getTeamsAction() {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canManageJobAssignments(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    const teams = await TeamService.getTeams();
    return { success: true, data: teams };
  } catch (error) {
    console.error("getTeamsAction error:", error);
    return { success: false, error: "Failed to retrieve teams" };
  }
}

export async function createTeamAction(data: { name: string; description?: string; branch_id?: string }) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canManageJobAssignments(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    const team = await TeamService.createTeam(data);
    revalidatePath("/job-assignments");
    return { success: true, data: team };
  } catch (error) {
    console.error("createTeamAction error:", error);
    return { success: false, error: "Failed to create team" };
  }
}

export async function updateTeamAction(id: string, data: { name?: string; description?: string; is_active?: boolean }) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canManageJobAssignments(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    const team = await TeamService.updateTeam(id, data);
    revalidatePath("/job-assignments");
    return { success: true, data: team };
  } catch (error) {
    console.error("updateTeamAction error:", error);
    return { success: false, error: "Failed to update team" };
  }
}

export async function addTeamMemberAction(teamId: string, employeeId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canManageJobAssignments(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    const member = await TeamService.addTeamMember(teamId, employeeId);
    revalidatePath("/job-assignments");
    return { success: true, data: member };
  } catch (error) {
    console.error("addTeamMemberAction error:", error);
    return { success: false, error: "Failed to add team member" };
  }
}

export async function removeTeamMemberAction(teamId: string, employeeId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canManageJobAssignments(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    await TeamService.removeTeamMember(teamId, employeeId);
    revalidatePath("/job-assignments");
    return { success: true };
  } catch (error) {
    console.error("removeTeamMemberAction error:", error);
    return { success: false, error: "Failed to remove team member" };
  }
}
