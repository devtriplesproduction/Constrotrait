import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { isHR, isSuperAdmin, isBranchManager } from "@/config/roles";
import { resolveWorkingDay } from "@/lib/holiday-utils";
import { Database } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";
import { validateFileMagicBytes, getAllowedExtension } from "@/lib/file-validation";

type AppSupabaseClient = SupabaseClient<Database> & {
  rpc: (
    fn: "submit_leave" | "approve_leave" | "reject_leave" | "cancel_leave" | "verify_medical_certificate" | "delete_medical_certificate" | "reject_medical_certificate",
    args?: Record<string, unknown>
  ) => Promise<{ error: { message: string, code?: string } | null; data: unknown }>;
};

export type LeaveRequest = Database["public"]["Tables"]["leave_requests"]["Row"];
export type CompOffLedger = Database["public"]["Tables"]["comp_off_ledger"]["Row"];

function getMedicalCertificateStorageLocation(raw: string): { bucket: string; path: string } {
  const buckets = ["medical-certificates", "medical_certificates"] as const;
  for (const bucket of buckets) {
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
    ];
    try {
      const url = new URL(raw);
      for (const marker of markers) {
        if (url.pathname.includes(marker)) {
          return { bucket, path: decodeURIComponent(url.pathname.split(marker)[1]) };
        }
      }
    } catch {
      // Stored value may already be a storage path.
    }
  }
  return { bucket: "medical-certificates", path: raw };
}

export type CreateLeaveInput = {
  leave_type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  reason: string;
  medical_certificate_url?: string;
};

// Leave Balance calculation for Comp-Off
export async function getCompOffBalance(employeeId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comp_off_ledger")
    .select("transaction_type, hours")
    .eq("employee_id", employeeId);

  if (error) {
    console.error("Failed to fetch comp-off ledger:", error);
    return 0;
  }

  let balance = 0;
  for (const record of data) {
    if (record.transaction_type === "CREDIT" || record.transaction_type === "REVERSAL" || record.transaction_type === "RELEASE") {
      balance += Number(record.hours);
    } else if (record.transaction_type === "DEBIT" || record.transaction_type === "HOLD") {
      balance -= Number(record.hours);
    }
  }

  return Math.max(0, balance);
}

// Calculate the number of working days in a date range for a specific employee
export async function calculateLeaveDurationDays(employeeId: string, startDate: string, endDate: string, isHalfDay: boolean): Promise<number> {
  if (isHalfDay) return 0.5;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) return 0;
  
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("branch_id, department")
    .eq("id", employeeId)
    .single();

  if (profileError || !profile) {
    throw new Error("Failed to resolve employee profile");
  }

  // Fetch holidays between start and end date
  const { data: holidays, error: holidayError } = await supabase
    .from("holidays")
    .select("date, branch_id, department")
    .gte("date", startDate)
    .lte("date", endDate)
    .eq("is_active", true);

  if (holidayError) {
    throw new Error("Failed to resolve holidays");
  }

  const activeHolidays = holidays || [];
  let workingDays = 0;
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const isWorking = resolveWorkingDay(dateStr, profile, activeHolidays);
    if (isWorking) {
      workingDays += 1;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

export async function submitLeave(input: CreateLeaveInput, medicalCertificate?: File) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };

    if (new Date(input.start_date) > new Date(input.end_date)) {
      return { success: false, error: "End date cannot be before start date." };
    }

    if (input.is_half_day && input.start_date !== input.end_date) {
      return { success: false, error: "Half-day leave must be for a single day." };
    }

    if (input.leave_type === "Compensatory Off") {
      const durationDays = await calculateLeaveDurationDays(user.id, input.start_date, input.end_date, input.is_half_day);
      const hoursRequired = durationDays * 8; // Full day = 8 hours, half day = 4 hours
      const balance = await getCompOffBalance(user.id);

      if (balance < hoursRequired) {
        return { success: false, error: `Insufficient Comp-Off balance. Required: ${hoursRequired} hours, Available: ${balance} hours.` };
      }
    }



    const supabase = await createClient() as unknown as AppSupabaseClient;
    let uploadedCertificatePath: string | null = null;

    if (medicalCertificate) {
      if (input.leave_type !== "Sick Leave") {
        return { success: false, error: "Medical certificates are only supported for Sick Leave." };
      }
      if (medicalCertificate.size > 5242880) {
        return { success: false, error: "Medical certificate exceeds 5MB limit." };
      }
      const ext = getAllowedExtension(medicalCertificate);
      if (!ext) {
        return { success: false, error: "Invalid medical certificate type. Only PDF, JPG, PNG, and WEBP are allowed." };
      }
      if (!(await validateFileMagicBytes(medicalCertificate))) {
        return { success: false, error: "Medical certificate content validation failed." };
      }
      uploadedCertificatePath = `employees/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("medical-certificates")
        .upload(uploadedCertificatePath, medicalCertificate, { upsert: false });
      if (uploadError) {
        return { success: false, error: "Failed to upload medical certificate." };
      }
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "submit_leave",
      {
        p_leave_type: input.leave_type,
        p_start_date: input.start_date,
        p_end_date: input.end_date,
        p_is_half_day: input.is_half_day,
        p_reason: input.reason,
        p_medical_certificate_url: uploadedCertificatePath || null
      }
    );

    const data = rpcData ? { id: rpcData } : null;
    const error = rpcError;

    if (error) {
      if (uploadedCertificatePath) {
        await supabase.storage.from("medical-certificates").remove([uploadedCertificatePath]);
      }
      console.error("Failed to submit leave:", error);
      return { success: false, error: "Failed to submit leave" };
    }

    // TODO: Send notification

    return { success: true, data };
  } catch (error) {
    console.error("Error submitting leave:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function approveLeave(leaveId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient() as unknown as AppSupabaseClient;

    const { error } = await supabase.rpc("approve_leave", {
      p_leave_id: leaveId,
    });

    if (error) {
      console.error("Failed to approve leave via RPC:", error);
      return {
        success: false,
        error: "Failed to approve leave",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error approving leave:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function rejectLeave(
  leaveId: string,
  reason: string
) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };

    const supabase = await createClient() as unknown as AppSupabaseClient;

    const { error } = await supabase.rpc("reject_leave", {
      p_leave_id: leaveId,
      p_reason: reason,
    });

    if (error) {
      console.error("Failed to reject leave via RPC:", error);

      return {
        success: false,
        error: "Failed to reject leave",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error rejecting leave:", error);

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function cancelApprovedLeave(leaveId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) return { success: false, error: "Unauthorized" };

    const supabase = await createClient() as unknown as AppSupabaseClient;
    const { data: leave, error: fetchError } = await supabase
      .from("leave_requests")
      .select("id, status")
      .eq("id", leaveId)
      .single();

    if (fetchError || !leave) return { success: false, error: "Leave not found" };
    if (leave.status !== "Approved") return { success: false, error: "Only approved leaves can be cancelled." };

    const { error: rpcError } = await supabase.rpc("cancel_leave", {
      p_leave_id: leaveId
    });

    if (rpcError) {
      console.error("Failed to cancel leave via RPC:", rpcError);
      return { success: false, error: "Failed to cancel leave" };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error cancelling leave:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function uploadMedicalCertificateForLeave(leaveId: string, file: File) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || (!isHR(user.roles) && !isSuperAdmin(user.roles))) return { success: false, error: "Unauthorized" };
    if (file.size > 5242880) return { success: false, error: "Medical certificate exceeds 5MB limit." };
    const ext = getAllowedExtension(file);
    if (!ext) return { success: false, error: "Invalid medical certificate type. Only PDF, JPG, PNG, and WEBP are allowed." };
    if (!(await validateFileMagicBytes(file))) return { success: false, error: "Medical certificate content validation failed." };

    const supabase = await createClient();
    const { data: leave } = await supabase
      .from("leave_requests")
      .select("employee_id, leave_type")
      .eq("id", leaveId)
      .single();
    if (!leave || leave.leave_type !== "Sick Leave") return { success: false, error: "Sick leave not found." };

    const { data: employee } = await supabase
      .from("profiles")
      .select("branch_id")
      .eq("id", leave.employee_id)
      .single();
    if (!employee) return { success: false, error: "Employee profile not found." };
    if (isHR(user.roles) && !isSuperAdmin(user.roles) && user.branch_id !== employee.branch_id) {
      return { success: false, error: "Unauthorized" };
    }

    const path = `leaves/${leaveId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("medical-certificates")
      .upload(path, file, { upsert: false });
    if (uploadError) return { success: false, error: "Failed to upload medical certificate." };

    return { success: true, path };
  } catch (error: unknown) {
    console.error("Error uploading medical certificate:", error);
    return { success: false, error: "Failed to upload medical certificate." };
  }
}

export async function getMedicalCertificateUrl(leaveId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();
    const { data: leave, error } = await supabase
      .from("leave_requests")
      .select("employee_id, medical_certificate_url")
      .eq("id", leaveId)
      .single();
    if (error || !leave?.medical_certificate_url) return { success: false, error: "Medical certificate not found" };

    const { data: employee } = await supabase
      .from("profiles")
      .select("branch_id")
      .eq("id", leave.employee_id)
      .single();

    const allowed = isSuperAdmin(user.roles) || (isHR(user.roles) && user.branch_id === employee?.branch_id) || user.id === leave.employee_id;
    if (!allowed) return { success: false, error: "Unauthorized" };

    const { bucket, path } = getMedicalCertificateStorageLocation(leave.medical_certificate_url);
    const { data: signed, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 300);
    if (signError || !signed?.signedUrl) return { success: false, error: "Failed to open medical certificate" };
    return { success: true, url: signed.signedUrl };
  } catch (error: unknown) {
    console.error("Error creating medical certificate URL:", error);
    return { success: false, error: "Failed to open medical certificate" };
  }
}

export async function verifyMedicalCertificate(leaveId: string, certificateUrl?: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) return { success: false, error: "Unauthorized" };

    const supabase = await createClient() as unknown as AppSupabaseClient;
    if (certificateUrl) {
      const { data: leave } = await supabase
        .from("leave_requests")
        .select("employee_id")
        .eq("id", leaveId)
        .single();
      if (!leave) return { success: false, error: "Leave not found" };
      const allowedEmployeePath = `employees/${leave.employee_id}/`;
      const allowedLeavePath = `leaves/${leaveId}/`;
      if (!certificateUrl.startsWith(allowedEmployeePath) && !certificateUrl.startsWith(allowedLeavePath)) {
        return { success: false, error: "Invalid medical certificate reference" };
      }
    }
    const { error: rpcError } = await supabase.rpc("verify_medical_certificate", {
      p_leave_id: leaveId,
      p_medical_certificate_url: certificateUrl || null
    });

    if (rpcError) {
      if (certificateUrl) {
        await supabase.storage.from("medical-certificates").remove([certificateUrl]);
      }
      console.error("Failed to verify certificate via RPC:", rpcError);
      return { success: false, error: "Failed to verify certificate" };
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Error verifying medical cert:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteMedicalCertificate(leaveId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) return { success: false, error: "Unauthorized" };

    const supabase = await createClient() as unknown as AppSupabaseClient;
    const { data: leave } = await supabase.from("leave_requests").select("medical_certificate_url").eq("id", leaveId).single();
    const { error: rpcError } = await supabase.rpc("delete_medical_certificate", { p_leave_id: leaveId });
    if (!rpcError && leave?.medical_certificate_url) {
      const { bucket, path } = getMedicalCertificateStorageLocation(leave.medical_certificate_url);
      const { error: storageError } = await supabase.storage.from(bucket).remove([path]);
      if (storageError) console.error("Medical certificate storage cleanup failed:", storageError.message);
    }

    if (rpcError) {
      console.error("Failed to delete medical certificate via RPC:", rpcError);
      return { success: false, error: "Failed to delete medical certificate" };
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting medical cert:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function rejectMedicalCertificate(leaveId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) return { success: false, error: "Unauthorized" };

    const supabase = await createClient() as unknown as AppSupabaseClient;
    const { error: rpcError } = await supabase.rpc("reject_medical_certificate", { p_leave_id: leaveId });

    if (rpcError) {
      console.error("Failed to reject medical certificate via RPC:", rpcError);
      return { success: false, error: "Failed to reject medical certificate" };
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Error rejecting medical cert:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getLeaves() {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leave_requests")
      .select("id, status, start_date, leave_type, end_date, is_half_day, reason, rejection_reason, is_paid")
      .eq("employee_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: "Failed to fetch leaves" };
    
    // Status mapping removed since we use Pending Level natively
    
    return { success: true, data };
  } catch (e: unknown) {
    console.error("Error fetching leaves:", e);
    return { success: false, error: "Error fetching leaves" };
  }
}

export async function getLeavesToApprove() {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();

    let query = supabase.from("leave_requests").select("id, status, leave_type, start_date, end_date, is_half_day, is_paid, reason, medical_certificate_url, certificate_verified_by, profiles!leave_requests_employee_id_fkey!inner(first_name, last_name, branch_id, reporting_manager_id)");

    if (isHR(user.roles) || isSuperAdmin(user.roles)) {
      // HR sees everything pending HR, or everything if they want, but pending HR is the action items
      query = query.in("status", ["Pending Level", "Approved", "Rejected", "Cancelled"]);
    } else if (isBranchManager(user.roles)) {
      // Branch manager sees their branch's pending level, or others for history (where they are reporting manager)
      query = query.or(`branch_id.eq.${user.branch_id},reporting_manager_id.eq.${user.id}`, { foreignTable: 'profiles' });
    } else {
      // Reporting manager sees only their direct reports
      query = query.eq('profiles.reporting_manager_id', user.id);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return { success: false, error: "Failed to fetch pending leaves" };

    return { success: true, data };
  } catch (e: unknown) {
    console.error("Error fetching pending leaves:", e);
    return { success: false, error: "Error fetching pending leaves" };
  }
}
