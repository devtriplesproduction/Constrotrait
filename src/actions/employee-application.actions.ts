"use server";

import { 
  createApplication as createApplicationService,
  updateApplicationStatus as updateApplicationStatusService,
  EmployeeApplicationStatus 
} from "@/services/employee-application.service";
import { revalidatePath } from "next/cache";

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
  const result = await updateApplicationStatusService(id, status, remark);
  if (result.success) {
    revalidatePath("/applications");
  }
  return result;
}
