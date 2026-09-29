"use server";

import { loginWithEmailPassword, logoutUser } from "@/services/auth.service";
import { LoginFormData } from "@/lib/validations/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function loginAction(data: LoginFormData) {
  const result = await loginWithEmailPassword(data);
  if (result.success) {
    revalidatePath("/", "layout");
    return { success: true };
  }
  return { success: false, error: result.error };
}

export async function logoutAction() {
  await logoutUser();
  revalidatePath("/", "layout");
  redirect("/login");
}
