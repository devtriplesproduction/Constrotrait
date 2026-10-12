import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";

export type EmployeeApplicationStatus = "pending" | "approved" | "rejected";

export interface EmployeeApplication {
  id: string;
  employee_id: string;
  application_date: string;
  subject: string;
  approval_for: string;
  reason: string;
  status: EmployeeApplicationStatus;
  reviewed_by: string | null;
  reviewer_remark: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    designation: string;
    department: string;
  };
}

export async function createApplication(data: {
  application_date: string;
  subject: string;
  approval_for: string;
  reason: string;
}) {
  const supabase = await createClient();
  const user = await getAuthenticatedUserWithRoles();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: inserted, error } = await supabase
    .from("employee_applications")
    .insert([
      {
        employee_id: user.id,
        application_date: data.application_date,
        subject: data.subject,
        approval_for: data.approval_for,
        reason: data.reason,
        status: "pending",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating application:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: inserted as EmployeeApplication };
}

export async function getMyApplications() {
  const supabase = await createClient();
  const user = await getAuthenticatedUserWithRoles();
  if (!user) return { success: false, error: "Not authenticated", data: [] };

  const { data, error } = await supabase
    .from("employee_applications")
    .select("*, profiles:employee_id (first_name, last_name, designation, department)")
    .eq("employee_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching applications:", error);
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data as EmployeeApplication[] };
}

export async function getApplicationsToReview() {
  const supabase = await createClient();
  const user = await getAuthenticatedUserWithRoles();
  if (!user) return { success: false, error: "Not authenticated", data: [] };

  const { data, error } = await supabase
    .from("employee_applications")
    .select("*, profiles:employee_id (first_name, last_name, designation, department)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching applications to review:", error);
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data as EmployeeApplication[] };
}

export async function updateApplicationStatus(
  id: string,
  status: EmployeeApplicationStatus,
  remark: string
) {
  const supabase = await createClient();
  const user = await getAuthenticatedUserWithRoles();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("employee_applications")
    .update({
      status,
      reviewed_by: user.id,
      reviewer_remark: remark,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating application:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as EmployeeApplication };
}
