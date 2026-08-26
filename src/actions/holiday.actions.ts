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

export async function createHolidayAction(data: CreateHolidayInput) {
  const result = await createHoliday(data);
  if (result.success) {
    revalidatePath("/holidays"); // Adjust path if needed
  }
  return result;
}

export async function updateHolidayAction(id: string, data: UpdateHolidayInput) {
  const result = await updateHoliday(id, data);
  if (result.success) {
    revalidatePath("/holidays");
  }
  return result;
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
