"use server";

import { revalidatePath } from "next/cache";
import { 
  createHoliday, 
  updateHoliday, 
  deactivateHoliday, 
  deleteHoliday,
  CreateHolidayInput,
  UpdateHolidayInput
} from "@/services/holiday.service";

export async function createHolidayAction(data: CreateHolidayInput & { branches?: string[] }) {
  const { branches, ...holidayData } = data;
  
  if (branches && branches.length > 1) {
    // Multiple branches selected, create a holiday for each
    for (const branch of branches) {
      const result = await createHoliday({ ...holidayData, branch_id: branch });
      if (!result.success) {
        return result; // return first error
      }
    }
    revalidatePath("/holidays");
    return { success: true };
  } else {
    // Single branch or all branches (null)
    const result = await createHoliday(holidayData);
    if (result.success) {
      revalidatePath("/holidays");
    }
    return result;
  }
}

export async function updateHolidayAction(id: string, data: UpdateHolidayInput & { branches?: string[] }) {
  const { branches, ...holidayData } = data;

  if (branches && branches.length > 1) {
    // Update the existing holiday with the first branch
    const updateResult = await updateHoliday(id, { ...holidayData, branch_id: branches[0] });
    if (!updateResult.success) {
      return updateResult;
    }

    // Create new holidays for the remaining branches
    for (let i = 1; i < branches.length; i++) {
      // Need to cast holidayData to CreateHolidayInput since we know name/date exist from the form
      const createResult = await createHoliday({ 
        name: holidayData.name as string, 
        date: holidayData.date as string, 
        description: holidayData.description || null,
        department: holidayData.department || null,
        branch_id: branches[i],
        is_active: holidayData.is_active !== undefined ? holidayData.is_active : true
      });
      if (!createResult.success) {
        // We could continue or return error. Let's return error but some might have been created.
        return createResult;
      }
    }
    revalidatePath("/holidays");
    return { success: true };
  } else {
    const result = await updateHoliday(id, holidayData);
    if (result.success) {
      revalidatePath("/holidays");
    }
    return result;
  }
}

export async function deactivateHolidayAction(id: string) {
  const result = await deactivateHoliday(id);
  if (result.success) {
    revalidatePath("/holidays");
  }
  return result;
}

export async function deleteHolidayAction(id: string) {
  const result = await deleteHoliday(id);
  if (result.success) {
    revalidatePath("/holidays");
  }
  return result;
}
