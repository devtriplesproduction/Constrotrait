import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { isHR, isSuperAdmin } from "@/config/roles";
import { createHolidayNotification } from "./notification.service";

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description: string | null;
  department: string | null;
  branch_id: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Included relations for branch
  branches?: {
    id: string;
    name: string;
  } | null;
}

export type CreateHolidayInput = Omit<
  Holiday,
  "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "branches"
>;
export type UpdateHolidayInput = Partial<CreateHolidayInput>;

export async function getHolidays() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("holidays")
      .select("*, branches(id, name)")
      .order("date", { ascending: true });

    if (error) {
      console.error("Failed to fetch holidays:", error);
      return { success: false, error: "Failed to fetch holidays" };
    }

    return { success: true, data: data as Holiday[] };
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function createHoliday(input: CreateHolidayInput) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) {
      return { success: false, error: "Insufficient permissions to create holidays." };
    }

    if (!input.department && !input.branch_id) {
      return { success: false, error: "A holiday must be specific to a branch or department." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("holidays")
      .insert({
        ...input,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "A holiday with this date and scope already exists." };
      }
      console.error("Failed to create holiday:", error);
      return { success: false, error: "Failed to create holiday" };
    }

    // Send notification
    await createHolidayNotification(
      `A new holiday "${input.name}" has been added for ${input.date}.`,
      { branchId: input.branch_id, department: input.department }
    );

    return { success: true, data: data as Holiday };
  } catch (error) {
    console.error("Error creating holiday:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateHoliday(id: string, input: UpdateHolidayInput) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) {
      return { success: false, error: "Insufficient permissions to update holidays." };
    }

    // Validate scope if attempting to update it
    if (input.department === null && input.branch_id === null) {
      return { success: false, error: "A holiday must be specific to a branch or department." };
    }

    const supabase = await createClient();
    
    // Fetch old holiday first
    const { data: oldHoliday, error: fetchError } = await supabase
      .from("holidays")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !oldHoliday) {
      return { success: false, error: "Holiday not found" };
    }

    const { data, error } = await supabase
      .from("holidays")
      .update({
        ...input,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "A holiday with this date and scope already exists." };
      }
      console.error("Failed to update holiday:", error);
      return { success: false, error: "Failed to update holiday" };
    }

    // Check for deactivation
    if (oldHoliday.is_active && input.is_active === false) {
      await createHolidayNotification(
        `The holiday "${oldHoliday.name}" on ${oldHoliday.date} has been cancelled.`,
        { branchId: oldHoliday.branch_id, department: oldHoliday.department }
      );
      return { success: true, data: data as Holiday };
    }

    // Check for scope or date changes
    const scopeChanged = 
      (input.branch_id !== undefined && input.branch_id !== oldHoliday.branch_id) || 
      (input.department !== undefined && input.department !== oldHoliday.department) ||
      (input.date !== undefined && input.date !== oldHoliday.date);

    if (scopeChanged && oldHoliday.is_active) {
      // Cancel for old scope
      await createHolidayNotification(
        `The holiday "${oldHoliday.name}" on ${oldHoliday.date} has been cancelled.`,
        { branchId: oldHoliday.branch_id, department: oldHoliday.department }
      );
      // New notification for new scope (if active)
      if (data.is_active) {
        await createHolidayNotification(
          `A new holiday "${data.name}" has been added for ${data.date}.`,
          { branchId: data.branch_id, department: data.department }
        );
      }
    } else if (data.is_active) {
      // Simple update notification for existing scope
      await createHolidayNotification(
        `The holiday "${data.name}" on ${data.date} has been updated.`,
        { branchId: data.branch_id, department: data.department }
      );
    }

    return { success: true, data: data as Holiday };
  } catch (error) {
    console.error("Error updating holiday:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deactivateHoliday(id: string) {
  return updateHoliday(id, { is_active: false });
}

export async function deleteHoliday(id: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) {
      return { success: false, error: "Insufficient permissions to delete holidays." };
    }

    const supabase = await createClient();

    // Fetch old holiday first
    const { data: oldHoliday, error: fetchError } = await supabase
      .from("holidays")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !oldHoliday) {
      return { success: false, error: "Holiday not found" };
    }

    const { error } = await supabase.from("holidays").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete holiday:", error);
      return { success: false, error: "Failed to delete holiday" };
    }

    if (oldHoliday.is_active) {
      await createHolidayNotification(
        `The holiday "${oldHoliday.name}" on ${oldHoliday.date} has been cancelled.`,
        { branchId: oldHoliday.branch_id, department: oldHoliday.department }
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Reusable function to determine if a specific date is a working day for an employee.
 * Returns true if it's a working day (Mon-Fri and no applicable holiday).
 * Returns false if it's a weekend (Sat-Sun) or an applicable holiday exists.
 */
export async function isWorkingDayForEmployee(employeeId: string, targetDateStr: string): Promise<boolean> {
  const datePart = targetDateStr.split('T')[0];
  const targetDate = new Date(`${datePart}T00:00:00Z`);
  
  if (isNaN(targetDate.getTime())) {
    throw new Error("Invalid date format");
  }

  const dayOfWeek = targetDate.getUTCDay(); // 0 is Sunday, 6 is Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false; // Weekend
  }

  const supabase = await createClient();

  // Get employee profile for branch_id and department
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("branch_id, department")
    .eq("id", employeeId)
    .single();

  if (profileError || !profile) {
    console.error("Failed to resolve employee for working-day check", profileError);
    // As per rules, return a safe result or throw. Throwing ensures we don't silently return "working day".
    throw new Error("Failed to resolve employee profile");
  }

  // Format date to YYYY-MM-DD for database query
  const dateStr = datePart;

  // Fetch active holidays on that date
  const { data: holidays, error: holidayError } = await supabase
    .from("holidays")
    .select("*")
    .eq("date", dateStr)
    .eq("is_active", true);

  if (holidayError) {
    throw new Error("Failed to resolve holidays");
  }

  if (!holidays || holidays.length === 0) {
    return true; // No holidays, so it's a working day
  }

  // Check if any holiday applies to this employee
  for (const holiday of holidays) {
    let applies = false;
    const matchesBranch = holiday.branch_id === profile.branch_id;
    const matchesDepartment = holiday.department === profile.department;

    if (holiday.branch_id && holiday.department) {
      if (matchesBranch && matchesDepartment) applies = true;
    } else if (holiday.branch_id && !holiday.department) {
      if (matchesBranch) applies = true;
    } else if (!holiday.branch_id && holiday.department) {
      if (matchesDepartment) applies = true;
    }

    if (applies) {
      return false; // Applicable holiday found
    }
  }

  return true; // No applicable holiday found
}
