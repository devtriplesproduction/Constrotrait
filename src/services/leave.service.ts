import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { isHR, isSuperAdmin, isBranchManager } from "@/config/roles";
import { isWorkingDayForEmployee } from "./holiday.service";
import { Database } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";

type AppSupabaseClient = SupabaseClient<Database> & {
  rpc: (
    fn: "approve_leave_first_level" | "approve_comp_off_leave" | "reject_leave" | "cancel_comp_off_leave" | "verify_medical_certificate",
    args?: Record<string, unknown>
  ) => Promise<{ error: { message: string, code?: string } | null; data: unknown }>;
};

export type LeaveRequest = Database["public"]["Tables"]["leave_requests"]["Row"];
export type CompOffLedger = Database["public"]["Tables"]["comp_off_ledger"]["Row"];

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
  let workingDays = 0;

  while (start <= end) {
    const dateStr = start.toISOString().split("T")[0];
    const isWorking = await isWorkingDayForEmployee(employeeId, dateStr);
    if (isWorking) {
      workingDays += 1;
    }
    start.setDate(start.getDate() + 1);
  }

  return workingDays;
}

export async function submitLeave(input: CreateLeaveInput) {
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

    if (input.leave_type === "Sick Leave" && !input.medical_certificate_url) {
      return { success: false, error: "Medical certificate is required to submit a Sick Leave." };
    }

    const supabase = await createClient();
    let data;
    let error;
    
    if (input.leave_type === "Compensatory Off") {
      // @ts-expect-error newly added rpc not in types yet
      const { data: rpcData, error: rpcError } = await (supabase as unknown as AppSupabaseClient).rpc(
        "submit_comp_off_leave" as any, 
        {
          p_start_date: input.start_date,
          p_end_date: input.end_date,
          p_is_half_day: input.is_half_day,
          p_reason: input.reason
        }
      );
      
      data = rpcData ? { id: rpcData } : null;
      error = rpcError;
    } else {
      const res = await supabase
        .from("leave_requests")
        .insert({
          employee_id: user.id,
          leave_type: input.leave_type,
          start_date: input.start_date,
          end_date: input.end_date,
          is_half_day: input.is_half_day,
          reason: input.reason,
          medical_certificate_url: input.medical_certificate_url || null,
          status: "Pending First Level",
          is_paid: false // Sick leave is unpaid until cert verified. Casual/Unpaid are unpaid.
        })
        .select()
        .single();
        
      data = res.data;
      error = res.error;
    }

    if (error) {
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

export async function approveLeaveFirstLevel(leaveId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient() as unknown as AppSupabaseClient;
    
    // Fetch leave first to validate
    const { data: leave, error: fetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", leaveId)
      .single();

    if (fetchError || !leave) return { success: false, error: "Leave not found" };

    if (leave.leave_type === "Sick Leave" && !leave.medical_certificate_url) {
      return { success: false, error: "Cannot approve Sick Leave without a medical certificate." };
    }

    const { error } = await supabase.rpc("approve_leave_first_level", {
      p_leave_id: leaveId,
    });

    if (error) {
      console.error("Failed to approve leave via RPC:", error);
      return {
        success: false,
        error: error.message || "Failed to approve leave",
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

export async function approveLeaveHR(leaveId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) return { success: false, error: "Unauthorized" };

    const supabase = await createClient() as unknown as AppSupabaseClient;
    const { data: leave, error: fetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", leaveId)
      .single();

    if (fetchError || !leave) return { success: false, error: "Leave not found" };
    if (leave.status !== "Pending HR") return { success: false, error: "Leave is not pending HR approval." };

    const { error: rpcError } = await supabase.rpc("approve_comp_off_leave", {
      p_leave_id: leaveId
    });

    if (rpcError) {
      console.error("Failed to approve leave via RPC:", rpcError);
      return { success: false, error: rpcError.message || "Failed to approve leave" };
    }

    // Since RPC doesn't return data, we can just fetch it if needed, or return success
    return { success: true };
  } catch (error) {
    console.error("Error approving leave:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function rejectLeave(
  leaveId: string,
  reason: string
) {
  try {
    const supabase = await createClient() as unknown as AppSupabaseClient;

    const { error } = await supabase.rpc("reject_leave", {
      p_leave_id: leaveId,
      p_reason: reason,
    });

    if (error) {
      console.error("Failed to reject leave via RPC:", error);

      return {
        success: false,
        error: error.message || "Failed to reject leave",
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
      .select("*")
      .eq("id", leaveId)
      .single();

    if (fetchError || !leave) return { success: false, error: "Leave not found" };
    if (leave.status !== "Approved") return { success: false, error: "Only approved leaves can be cancelled." };

    const { error: rpcError } = await supabase.rpc("cancel_comp_off_leave", {
      p_leave_id: leaveId
    });

    if (rpcError) {
      console.error("Failed to cancel leave via RPC:", rpcError);
      return { success: false, error: rpcError.message || "Failed to cancel leave" };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error cancelling leave:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function verifyMedicalCertificate(leaveId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) return { success: false, error: "Unauthorized" };

    const supabase = await createClient() as unknown as AppSupabaseClient;
    const { error: rpcError } = await supabase.rpc("verify_medical_certificate", {
      p_leave_id: leaveId
    });

    if (rpcError) {
      console.error("Failed to verify certificate via RPC:", rpcError);
      return { success: false, error: rpcError.message || "Failed to verify certificate" };
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Error verifying medical cert:", error);
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
      .select("*")
      .eq("employee_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: "Failed to fetch leaves" };
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

    let query = supabase.from("leave_requests").select("*, profiles!leave_requests_employee_id_fkey(first_name, last_name, branch_id, reporting_manager_id)");

    if (isHR(user.roles) || isSuperAdmin(user.roles)) {
      // HR sees everything pending HR, or everything if they want, but pending HR is the action items
      query = query.in("status", ["Pending HR", "Approved", "Rejected", "Cancelled"]);
    } else if (isBranchManager(user.roles)) {
      // Branch manager sees their branch's pending First level, or others for history
      // We just fetch all for their branch in JS
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return { success: false, error: "Failed to fetch pending leaves" };

    let finalData = data;
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) {
      finalData = data.filter((l: Record<string, unknown>) => {
        const profiles = l.profiles as { branch_id: string, reporting_manager_id: string | null } | null;
        const isManagerOfBranch = isBranchManager(user.roles) && profiles?.branch_id === user.branch_id;
        const isReportingManager = profiles?.reporting_manager_id === user.id;
        return isManagerOfBranch || isReportingManager;
      });
    }

    return { success: true, data: finalData };
  } catch (e: unknown) {
    console.error("Error fetching pending leaves:", e);
    return { success: false, error: "Error fetching pending leaves" };
  }
}
