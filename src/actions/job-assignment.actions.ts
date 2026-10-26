"use server";

import { revalidatePath } from "next/cache";
import { JobAssignmentService } from "@/services/job-assignment.service";

export async function getAssignmentsAction(filters?: { team_id?: string; employee_id?: string; status?: string; branch_id?: string }) {
  try {
    const assignments = await JobAssignmentService.getAssignments(filters);
    return { success: true, data: assignments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAssignmentByIdAction(id: string) {
  try {
    const assignment = await JobAssignmentService.getAssignmentById(id);
    return { success: true, data: assignment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUnassignedJobCardsAction(branchId?: string) {
  try {
    const unassigned = await JobAssignmentService.getUnassignedJobCards(branchId);
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
  branch_id?: string;
}) {
  try {
    const assignment = await JobAssignmentService.assignJobCard(data);
    revalidatePath("/job-assignments");
    return { success: true, data: assignment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAssignmentStatusAction(id: string, status: string, payload?: { report_url?: string; reviewer_remark?: string }) {
  try {
    const assignment = await JobAssignmentService.updateAssignmentStatus(id, status, payload);
    revalidatePath("/job-assignments");
    return { success: true, data: assignment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAssignmentAction(id: string) {
  try {
    await JobAssignmentService.deleteAssignment(id);
    revalidatePath("/job-assignments");
    return { success: true };
  } catch (error) {
    console.error("deleteAssignmentAction error:", error);
    return { success: false, error: "Failed to delete assignment" };
  }
}

export async function getRelatedAssignmentsAndTestsAction(jobEntryId: string) {
  try {
    const data = await JobAssignmentService.getRelatedAssignmentsAndTests(jobEntryId);
    return { success: true, data };
  } catch (error) {
    console.error("getRelatedAssignmentsAndTestsAction error:", error);
    return { success: false, error: "Failed to retrieve related tests and assignments" };
  }
}

export async function getTestsDueTodayAction(userId: string) {
  try {
    const data = await JobAssignmentService.getTestsDueToday(userId);
    return { success: true, data };
  } catch (error) {
    console.error("getTestsDueTodayAction error:", error);
    return { success: false, error: "Failed to check tests due today" };
  }
}
