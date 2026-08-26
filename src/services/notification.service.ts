import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "./auth.service";

export type NotificationType = "LOGIN" | "PASSWORD_CHANGE";

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Creates a notification for all users who have SUPER_ADMIN or HR roles.
 */
export async function createAdminNotification(message: string, type: NotificationType) {
  try {
    const supabaseAdmin = createAdminClient();

    // Fetch all profiles that have either SUPER_ADMIN or HR role
    // Since roles is a text array, we use the contains operator or or filter.
    const { data: adminProfiles, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .or('roles.cs.{"SUPER_ADMIN"},roles.cs.{"HR"}');

    if (fetchError) {
      console.error("Failed to fetch admins for notification:", fetchError);
      return { success: false, error: "Failed to create notification" };
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      return { success: true };
    }

    // Create a notification for each admin
    const notifications = adminProfiles.map((profile) => ({
      user_id: profile.id,
      message,
      type,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("Failed to insert notifications:", insertError);
      return { success: false, error: "Failed to create notification" };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error creating notification:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getNotifications() {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, message, type, is_read, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return { success: true, data: data as Notification[] };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getUnreadNotificationCount() {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);

    if (error) throw error;
    return { success: true, count: count || 0 };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", currentUser.id);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("user_id", currentUser.id)
      .eq("is_read", false);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('Operation failed:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
