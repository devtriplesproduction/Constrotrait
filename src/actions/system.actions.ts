"use server";

import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canAccessSystemConsole } from "@/config/roles";
import {
  getLoginAuditLogs,
  LoginAuditFilter,
} from "@/services/login-audit.service";
import {
  generateFullDatabaseBackup,
  getBackupHistory,
  getRestoreHistory,
  inspectUploadedBackup,
  repopulateDatabase,
  RepopulateOptions,
  BackupPayload,
} from "@/services/database-backup.service";
import { revalidatePath } from "next/cache";

async function assertSystemAccess() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    throw new Error("Unauthorized: Please sign in.");
  }

  const allRoles = user.allRoles || user.roles || [];
  if (!canAccessSystemConsole(allRoles)) {
    throw new Error("Forbidden: Access is restricted to Super Admin and Developer roles.");
  }

  return {
    id: user.id,
    email: user.email || "system@constrotrait.com",
    name: user.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`.trim()
      : undefined,
    roles: allRoles,
  };
}

/**
 * Fetch paginated login audit logs
 */
export async function getLoginAuditLogsAction(filters: LoginAuditFilter = {}) {
  try {
    await assertSystemAccess();
    const result = await getLoginAuditLogs(filters);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch login logs." };
  }
}

/**
 * Generate full database backup and return payload and metadata
 */
export async function generateDatabaseBackupAction() {
  try {
    const user = await assertSystemAccess();
    const result = await generateFullDatabaseBackup(user);
    revalidatePath("/system");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate database backup." };
  }
}

/**
 * Fetch past database backups
 */
export async function getBackupHistoryAction() {
  try {
    await assertSystemAccess();
    const history = await getBackupHistory();
    return { success: true, data: history };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch backup history." };
  }
}

/**
 * Inspect uploaded JSON backup file content
 */
export async function inspectUploadedBackupAction(jsonContent: string) {
  try {
    await assertSystemAccess();
    const inspection = await inspectUploadedBackup(jsonContent);
    return { success: true, data: inspection };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to inspect backup file." };
  }
}

/**
 * Repopulate database with uploaded data
 */
export async function repopulateDatabaseAction(
  jsonContent: string,
  options: RepopulateOptions
) {
  try {
    const user = await assertSystemAccess();
    const payload: BackupPayload = JSON.parse(jsonContent);

    if (!payload || !payload.tables) {
      return { success: false, error: "Invalid backup file: 'tables' section is missing." };
    }

    const result = await repopulateDatabase(payload, options, user);
    revalidatePath("/", "layout");
    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to repopulate database." };
  }
}

/**
 * Fetch past database restore logs
 */
export async function getRestoreHistoryAction() {
  try {
    await assertSystemAccess();
    const history = await getRestoreHistory();
    return { success: true, data: history };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch restore history." };
  }
}
