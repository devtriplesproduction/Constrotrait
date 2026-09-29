"use server";

import { onboardEmployee } from "@/services/employee.service";
import { onboardSchema, type OnboardFormData } from "@/lib/validations/onboard";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser, getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageEmployees } from "@/config/roles";
import { validateFileMagicBytes, getAllowedExtension } from "@/lib/file-validation";
import { createClient } from "@/lib/supabase/server";

export async function onboardEmployeeAction(data: OnboardFormData) {
  // Validate data server-side
  const validationResult = onboardSchema.safeParse(data);
  if (!validationResult.success) {
    return { success: false, error: "Validation failed: " + validationResult.error.errors[0].message };
  }

  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }
  const result = await onboardEmployee(validationResult.data);
  if (result.success) {
    revalidatePath("/employees", "page");
  }
  return result;
}

export async function getCurrentUserProfileAction() {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const { getCurrentUserProfile } = await import("@/services/employee.service");
  const result = await getCurrentUserProfile();
  return JSON.parse(JSON.stringify(result));
}

export async function getTodayBirthdaysAction() {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const { getTodayBirthdays } = await import("@/services/employee.service");
  const result = await getTodayBirthdays();
  return JSON.parse(JSON.stringify(result));
}

export async function getAllEmployeesAction(options?: { compact?: boolean }) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const { getAllEmployees } = await import("@/services/employee.service");
  const result = await getAllEmployees(options);
  return JSON.parse(JSON.stringify(result));
}

export async function uploadEmployeeFileAction(formData: FormData) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  if (file.size > 5242880) {
    return { success: false, error: "File exceeds 5MB limit" };
  }

  const ext = getAllowedExtension(file);
  if (!ext) {
    return { success: false, error: "Invalid file extension. Only PDF, JPG, PNG, and WEBP are allowed." };
  }

  const requestedBranchId = formData.get("branch_id");
  const branchId = typeof requestedBranchId === "string" && requestedBranchId.length > 0 ? requestedBranchId : user.branch_id;
  const isSuperAdminUser = user.roles.includes("SUPER_ADMIN");

  if (!branchId && !isSuperAdminUser) {
    return { success: false, error: "A branch is required for employee document uploads." };
  }

  if (branchId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(branchId)) {
    return { success: false, error: "Invalid branch ID format." };
  }

  if (!isSuperAdminUser && branchId !== user.branch_id) {
    return { success: false, error: "You can only upload documents for your assigned branch." };
  }

  if (branchId) {
    const supabase = await createClient();
    const { data: branch } = await supabase.from("branches").select("id, is_active").eq("id", branchId).maybeSingle();
    if (!branch || !branch.is_active) {
      return { success: false, error: "The selected branch does not exist or is inactive." };
    }
  }

  const isValidMagic = await validateFileMagicBytes(file);
  if (!isValidMagic) {
    return { success: false, error: "File content validation failed. The file is corrupted or spoofed." };
  }

  const supabase = await createClient();
  const storageScope = branchId || "unassigned";
  const finalName = `onboarding/${storageScope}/${crypto.randomUUID()}.${ext}`;
  
  const { error } = await supabase.storage
    .from('employee-documents')
    .upload(finalName, file);

  if (error) {
    return { success: false, error: `Failed to upload file: ${error.message}` };
  }

  return { success: true, path: finalName, size: file.size, name: file.name };
}

export async function getEmployeeDocumentUrlAction(path: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  if (!path || typeof path !== "string" || path.includes("..")) {
    return { success: false, error: "Invalid path format" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from('employee-documents')
    .createSignedUrl(path, 3600, { download: true });

  if (error || !data) {
    return { success: false, error: "Failed to generate URL or unauthorized" };
  }

  return { success: true, url: data.signedUrl };
}

export async function deleteEmployeeDocumentAction(path: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  if (!path || typeof path !== "string" || path.includes("..")) {
    return { success: false, error: "Invalid path format" };
  }

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from('employee-documents')
    .remove([path]);

  if (error) {
    return { success: false, error: "Failed to delete document or unauthorized" };
  }

  return { success: true };
}

export async function updateEmployeeWorkEmailAction(employeeId: string, newEmail: string) {
  const { workEmailSchema } = await import("@/lib/validations/onboard");
  
  // Validate email format
  const validationResult = workEmailSchema.safeParse(newEmail);
  if (!validationResult.success) {
    return { success: false, error: validationResult.error.errors[0].message };
  }

  const user = await getAuthenticatedUserWithRoles();
  if (!user || (!canManageEmployees(user.roles) && !user.roles.includes("BRANCH_MANAGER_ADMINISTRATIVE"))) {
    return { success: false, error: "Unauthorized" };
  }

  const { updateEmployeeWorkEmail } = await import("@/services/employee.service");
  const result = await updateEmployeeWorkEmail(employeeId, newEmail);
  
  if (result.success) {
    revalidatePath("/employees", "page");
  }
  
  return result;
}
