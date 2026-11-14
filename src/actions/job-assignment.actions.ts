"use server";

import { revalidatePath } from "next/cache";
import { JobAssignmentService } from "@/services/job-assignment.service";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageJobAssignments, canManageClientsAndJobs, isSuperAdmin } from "@/config/roles";

export async function getAssignmentsAction(filters?: { team_id?: string; employee_id?: string; status?: string; branch_id?: string }) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    const isSuper = isSuperAdmin(user.roles);
    const effectiveFilters = {
      ...filters,
      branch_id: isSuper ? filters?.branch_id : (user.branch_id || undefined),
    };
    const assignments = await JobAssignmentService.getAssignments(effectiveFilters);
    return { success: true, data: assignments };
  } catch (error: any) {
    console.warn("getAssignmentsAction warning:", error);
    return { success: false, error: error.message || "Failed to retrieve assignments" };
  }
}

export async function getAssignmentByIdAction(id: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    const assignment = await JobAssignmentService.getAssignmentById(id);
    return { success: true, data: assignment };
  } catch (error: any) {
    console.error("getAssignmentByIdAction error:", error);
    return { success: false, error: error.message || "Failed to retrieve assignment" };
  }
}

export async function getUnassignedJobCardsAction(branchId?: string, options?: { limit?: number; offset?: number }) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || (!canManageJobAssignments(user.roles) && !canManageClientsAndJobs(user.roles))) {
      return { success: false, error: "Unauthorized" };
    }
    const isSuper = isSuperAdmin(user.roles);
    const effectiveBranchId = isSuper ? branchId : (user.branch_id || undefined);
    const unassigned = await JobAssignmentService.getUnassignedJobCards(effectiveBranchId, options);
    return { success: true, data: unassigned };
  } catch (error: any) {
    console.error("getUnassignedJobCardsAction error:", error);
    return { success: false, error: error.message || "Failed to retrieve unassigned job cards" };
  }
}

export async function getMyAssignmentsAction(userId?: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    const assignments = await JobAssignmentService.getMyAssignments(userId || user.id);
    return { success: true, data: assignments };
  } catch (error: any) {
    console.error("getMyAssignmentsAction error:", error);
    return { success: false, error: error.message || "Failed to retrieve assignments" };
  }
}

export async function getTodayAssignedTestsAction(userId?: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized", data: [] };
    const targetUserId = userId || user.id;
    const data = await JobAssignmentService.getTodayAssignedTests(targetUserId);
    return { success: true, data };
  } catch (error: any) {
    console.warn("getTodayAssignedTestsAction warning:", error);
    return { success: false, error: error.message || "Failed to retrieve today tests", data: [] };
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
    const user = await getAuthenticatedUserWithRoles();
    if (!user || (!canManageJobAssignments(user.roles) && !canManageClientsAndJobs(user.roles))) {
      return { success: false, error: "Unauthorized: Insufficient permissions to assign job card" };
    }
    const isSuper = isSuperAdmin(user.roles);
    const effectiveBranchId = isSuper ? data.branch_id : user.branch_id;
    const assignment = await JobAssignmentService.assignJobCard({
      ...data,
      branch_id: effectiveBranchId || undefined,
    });
    revalidatePath("/job-assignments");
    return { success: true, data: assignment };
  } catch (error: any) {
    console.error("assignJobCardAction error:", error);
    return { success: false, error: error.message || "Failed to assign job card" };
  }
}

export async function assignJobCardsBatchAction(data: {
  job_entry_test_ids: string[];
  team_id?: string;
  assigned_to?: string;
  due_date?: string;
  notes?: string;
  branch_id?: string;
}) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || (!canManageJobAssignments(user.roles) && !canManageClientsAndJobs(user.roles))) {
      return { success: false, error: "Unauthorized: Insufficient permissions to assign job card" };
    }
    const isSuper = isSuperAdmin(user.roles);
    const effectiveBranchId = isSuper ? data.branch_id : user.branch_id;
    const results = await Promise.all(
      data.job_entry_test_ids.map(testId =>
        JobAssignmentService.assignJobCard({
          job_entry_test_id: testId,
          team_id: data.team_id,
          assigned_to: data.assigned_to,
          due_date: data.due_date,
          notes: data.notes,
          branch_id: effectiveBranchId || undefined,
        })
      )
    );
    revalidatePath("/job-assignments");
    return { success: true, count: results.length, data: results };
  } catch (error: any) {
    console.error("assignJobCardsBatchAction error:", error);
    return { success: false, error: error.message || "Failed to assign job card(s)" };
  }
}

export async function updateAssignmentStatusAction(id: string, status: string, payload?: { report_url?: string; reviewer_remark?: string }) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    const assignment = await JobAssignmentService.updateAssignmentStatus(id, status, payload);
    revalidatePath("/job-assignments");
    return { success: true, data: assignment };
  } catch (error: any) {
    console.error("updateAssignmentStatusAction error:", error);
    return { success: false, error: error.message || "Failed to update assignment status" };
  }
}

export async function deleteAssignmentAction(id: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canManageJobAssignments(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
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
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    const data = await JobAssignmentService.getRelatedAssignmentsAndTests(jobEntryId);
    return { success: true, data };
  } catch (error) {
    console.error("getRelatedAssignmentsAndTestsAction error:", error);
    return { success: false, error: "Failed to retrieve related tests and assignments" };
  }
}

export async function getTestsDueTodayAction(requestedUserId?: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    const isSuper = isSuperAdmin(user.roles);
    const targetUserId = (isSuper && requestedUserId) ? requestedUserId : user.id;
    const data = await JobAssignmentService.getTestsDueToday(targetUserId);
    return { success: true, data };
  } catch (error) {
    console.error("getTestsDueTodayAction error:", error);
    return { success: false, error: "Failed to check tests due today" };
  }
}

export async function uploadTestDocumentAction(formData: FormData) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    if (file.size > 15 * 1024 * 1024) {
      return { success: false, error: "File exceeds 15MB maximum limit." };
    }

    const { validateFileMagicBytes, getAllowedExtension } = await import("@/lib/file-validation");
    const ext = getAllowedExtension(file, { allowExcel: true });
    if (!ext) {
      return { success: false, error: "Invalid file extension. Only PDF, Excel (XLSX, XLS, CSV), and verified images are allowed." };
    }

    const isValidMagic = await validateFileMagicBytes(file, { allowExcel: true });
    if (!isValidMagic) {
      return { success: false, error: "Invalid file type. Only PDF, Excel, and verified images are allowed." };
    }

    const fileName = `${user.id}_${Date.now()}.${ext}`;

    const contentTypeMap: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      csv: "text/csv",
      xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
      xlsb: "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
    };

    const contentType = file.type || contentTypeMap[ext] || "application/octet-stream";

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage.from("reports").upload(fileName, file, {
      upsert: true,
      contentType,
    });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("reports").getPublicUrl(fileName);
    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error("uploadTestDocumentAction error:", error);
    return { success: false, error: "Failed to upload document" };
  }
}
