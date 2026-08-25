"use server";

import { getAuthenticatedUser } from "@/services/auth.service";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/notification.service";

export async function getNotificationsAction() {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };
  return getNotifications();
}

export async function getUnreadNotificationCountAction() {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };
  return getUnreadNotificationCount();
}

export async function markNotificationAsReadAction(notificationId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };
  return markNotificationAsRead(notificationId);
}

export async function markAllNotificationsAsReadAction() {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };
  return markAllNotificationsAsRead();
}
