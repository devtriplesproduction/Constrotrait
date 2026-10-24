"use server";

import { loginWithEmailPassword, logoutUser } from "@/services/auth.service";
import { LoginFormData } from "@/lib/validations/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { cookies } from "next/headers";
import { getAuthenticatedUser } from "@/services/auth.service";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(data: LoginFormData) {
  const result = await loginWithEmailPassword(data);
  if (result.success) {
    revalidatePath("/", "layout");
    return { success: true };
  }
  return { success: false, error: result.error };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("active_role");
  await logoutUser();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function switchActiveRoleAction(newRole: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single();

  const userRoles = (profile?.roles || []) as string[];
  if (!userRoles.includes(newRole)) {
    return { success: false, error: "Invalid role selected" };
  }

  const cookieStore = await cookies();
  cookieStore.set("active_role", newRole, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
    httpOnly: false,
  });

  revalidatePath("/", "layout");
  return { success: true, activeRole: newRole };
}
