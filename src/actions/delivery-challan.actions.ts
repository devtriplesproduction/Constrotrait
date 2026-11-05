"use server";

import { 
  createDeliveryChallan as createDeliveryChallanService,
  deleteDeliveryChallan as deleteDeliveryChallanService,
  getNextChallanNumber as getNextChallanNumberService
} from "@/services/delivery-challan.service";
import { CreateDeliveryChallanInput } from "@/types/delivery-challan";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";

export async function createDeliveryChallan(data: CreateDeliveryChallanInput) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const result = await createDeliveryChallanService(data);
  if (result.success) {
    revalidatePath("/delivery-challan");
  }
  return result;
}

export async function deleteDeliveryChallan(id: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const result = await deleteDeliveryChallanService(id);
  if (result.success) {
    revalidatePath("/delivery-challan");
  }
  return result;
}

export async function getNextChallanNumber() {
  return await getNextChallanNumberService();
}
