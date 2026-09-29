"use server";

import { revalidatePath } from "next/cache";
import { JobAssignmentService } from "@/services/job-assignment.service";

export async function getAssignmentsAction(filters?: { team_id?: string; employee_id?: string; status?: string }) {
  try {
    const assignments = await JobAssignmentService.getAssignments(filters);
    return { success: true, data: assignments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUnassignedJobCardsAction() {
  try {
    const unassigned = await JobAssignmentService.getUnassignedJobCards();
    return { success: true, data: unassigned };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMyAssignmentsAction(userId: string) {
  try {
    const assignments = await JobAssignmentService.getMyAssignments(userId);
    return { success: true, data: assignments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignJobCardAction(data: {
  job_entry_test_id: string;
  team_id?: string;
  assigned_to?: string;
  due_date?: string;
  notes?: string;
}) {
  try {
    const assignment = await JobAssignmentService.assignJobCard(data);
    revalidatePath("/job-assignments");
    return { success: true, data: assignment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAssignmentStatusAction(id: string, status: string) {
  try {
    const assignment = await JobAssignmentService.updateAssignmentStatus(id, status);
    revalidatePath("/job-assignments");
    return { success: true, data: assignment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
