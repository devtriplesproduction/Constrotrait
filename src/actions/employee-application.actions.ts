"use server";

import { 
  createApplication as createApplicationService,
  updateApplicationStatus as updateApplicationStatusService,
  EmployeeApplicationStatus 
} from "@/services/employee-application.service";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { isSuperAdmin, isHR, isBranchManager } from "@/config/roles";

export async function createApplication(data: {
  application_date: string;
  subject: string;
  approval_for: string;
  reason: string;
}) {
  const result = await createApplicationService(data);
  if (result.success) {
    revalidatePath("/applications");
  }
  return result;
}

export async function updateApplicationStatus(id: string, status: EmployeeApplicationStatus, remark: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!isSuperAdmin(user.roles) && !isHR(user.roles) && !isBranchManager(user.roles)) {
    return { success: false, error: "Unauthorized access: insufficient permissions" };
  }

  const result = await updateApplicationStatusService(id, status, remark);
  if (result.success) {
    revalidatePath("/applications");
  }
  return result;
}
