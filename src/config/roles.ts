import { Database } from "@/types/database";

export type AppRole = Database["public"]["Enums"]["user_role"];

export const APP_ROLES: Record<AppRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  BRANCH_MANAGER_ADMINISTRATIVE: 'Branch Manager (Administrative)',
  HR: 'HR',
  QUALITY_MANAGER: 'Quality Manager',
  TECHNICAL_MANAGER: 'Technical Manager',
  ADMIN_INWARD_CRE: 'Admin / Inward / CRE',
  ACCOUNTANT: 'Accountant',
  TEST_ENGINEER: 'Test Engineer',
  LAB_ANALYST: 'Lab Analyst',
  LAB_ASSISTANT: 'Lab Assistant',
  SAMPLER: 'Sampler',
  MARKETING_EXECUTIVE: 'Marketing Executive',
  DIGITAL_MARKETING: 'Digital Marketing',
} as const;

export const ONBOARDING_ROLES = Object.entries(APP_ROLES)
  .filter(([key]) => key !== 'SUPER_ADMIN')
  .map(([id, name]) => ({ id: id as AppRole, name }));

export const APP_ROLE_KEYS = Object.keys(APP_ROLES) as [AppRole, ...AppRole[]];
export const ONBOARDING_ROLE_KEYS = APP_ROLE_KEYS.filter(role => role !== 'SUPER_ADMIN') as [AppRole, ...AppRole[]];

/**
 * Common authorization helpers
 */

// Common authorization helpers

export function isSuperAdmin(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("SUPER_ADMIN");
}

export function isBranchManager(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("BRANCH_MANAGER_ADMINISTRATIVE");
}

export function isHR(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("HR");
}

export function isSuperAdminOrHR(roles?: string[] | null): boolean {
  return isSuperAdmin(roles) || isHR(roles);
}

export function isSuperAdminOrBranchManager(roles?: string[] | null): boolean {
  return isSuperAdmin(roles) || isBranchManager(roles);
}

export function canManageEmployees(roles?: string[] | null): boolean {
  return isSuperAdmin(roles) || isBranchManager(roles) || isHR(roles);
}

export function canViewAllBirthdays(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("SUPER_ADMIN") || roles.includes("HR") || roles.includes("BRANCH_MANAGER_ADMINISTRATIVE");
}

export function canManageEOD(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("SUPER_ADMIN") || roles.includes("HR") || roles.includes("BRANCH_MANAGER_ADMINISTRATIVE");
}

export function canReviewEOD(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("SUPER_ADMIN") || roles.includes("HR") || roles.includes("BRANCH_MANAGER_ADMINISTRATIVE");
}

