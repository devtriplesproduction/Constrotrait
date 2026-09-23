"use server";

import { revalidatePath } from "next/cache";
import { TeamService } from "@/services/team.service";

export async function getTeamsAction() {
  try {
    const teams = await TeamService.getTeams();
    return { success: true, data: teams };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTeamAction(data: { name: string; description?: string; branch_id?: string }) {
  try {
    const team = await TeamService.createTeam(data);
    revalidatePath("/job-assignments");
    return { success: true, data: team };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTeamAction(id: string, data: { name?: string; description?: string; is_active?: boolean }) {
  try {
    const team = await TeamService.updateTeam(id, data);
    revalidatePath("/job-assignments");
    return { success: true, data: team };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addTeamMemberAction(teamId: string, employeeId: string) {
  try {
    const member = await TeamService.addTeamMember(teamId, employeeId);
    revalidatePath("/job-assignments");
    return { success: true, data: member };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeTeamMemberAction(teamId: string, employeeId: string) {
  try {
    await TeamService.removeTeamMember(teamId, employeeId);
    revalidatePath("/job-assignments");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
