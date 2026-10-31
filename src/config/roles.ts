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
  DEVELOPER: 'Developer',
} as const;

export const ONBOARDING_ROLES = Object.entries(APP_ROLES)
  .filter(([key]) => key !== 'SUPER_ADMIN')
  .map(([id, name]) => ({ id: id as AppRole, name }));

export const APP_ROLE_KEYS = Object.keys(APP_ROLES) as [AppRole, ...AppRole[]];
export const ONBOARDING_ROLE_KEYS = APP_ROLE_KEYS.filter(role => role !== 'SUPER_ADMIN') as [AppRole, ...AppRole[]];

export function isSuperAdmin(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("SUPER_ADMIN");
}

export function isDeveloper(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("DEVELOPER");
}

export function canAccessSystemConsole(roles?: string[] | null): boolean {
  return isSuperAdmin(roles) || isDeveloper(roles);
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

export function isTestEngineer(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("TEST_ENGINEER");
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

export function canManageTestMaster(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("SUPER_ADMIN") || roles.includes("QUALITY_MANAGER") || roles.includes("TECHNICAL_MANAGER") || roles.includes("BRANCH_MANAGER_ADMINISTRATIVE") || roles.includes("ADMIN_INWARD_CRE");
}

export function isAdminInwardCRE(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("ADMIN_INWARD_CRE");
}

export function canManageClientsAndJobs(roles?: string[] | null): boolean {
  if (!roles) return false;
  return (
    roles.includes("SUPER_ADMIN") ||
    roles.includes("BRANCH_MANAGER_ADMINISTRATIVE") ||
    roles.includes("ADMIN_INWARD_CRE") ||
    roles.includes("HR")
  );
}

export function canManageJobAssignments(roles?: string[] | null): boolean {
  if (!roles) return false;
  return (
    roles.includes("SUPER_ADMIN") ||
    roles.includes("BRANCH_MANAGER_ADMINISTRATIVE") ||
    roles.includes("ADMIN_INWARD_CRE") ||
    roles.includes("HR")
  );
}

export function canIssueLabReport(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("SUPER_ADMIN")
    || roles.includes("QUALITY_MANAGER")
    || roles.includes("TECHNICAL_MANAGER")
    || roles.includes("TEST_ENGINEER")
    || roles.includes("BRANCH_MANAGER_ADMINISTRATIVE");
}

export function canManageTestResults(roles?: string[] | null): boolean {
  if (!roles) return false;
  return (
    roles.includes("SUPER_ADMIN") ||
    roles.includes("BRANCH_MANAGER_ADMINISTRATIVE") ||
    roles.includes("QUALITY_MANAGER") ||
    roles.includes("TECHNICAL_MANAGER") ||
    roles.includes("TEST_ENGINEER") ||
    roles.includes("LAB_ANALYST")
  );
}

export function isAccountant(roles?: string[] | null): boolean {
  if (!roles) return false;
  return roles.includes("ACCOUNTANT");
}

/** Accountant can add/edit/cancel/view financial transactions */
export function canManageAccountingTransactions(roles?: string[] | null): boolean {
  if (!roles) return false;
  return isSuperAdmin(roles) || isAccountant(roles);
}

/** Owner/Director (Super Admin) and Branch Manager: approvals and audits only */
export function canApproveAccounting(roles?: string[] | null): boolean {
  if (!roles) return false;
  return isSuperAdmin(roles) || isBranchManager(roles);
}

/** View accounting module (transactions or audit) */
export function canViewAccounting(roles?: string[] | null): boolean {
  if (!roles) return false;
  return isSuperAdmin(roles) || isAccountant(roles) || isBranchManager(roles) || isDeveloper(roles);
}

/** Excel export restricted to Super Admin */
export function canExportAccountingExcel(roles?: string[] | null): boolean {
  return isSuperAdmin(roles);
}

export function getRoleDisplayName(role?: string | null): string {
  if (!role) return "User";
  return (APP_ROLES as Record<string, string>)[role] || role.replace(/_/g, " ");
}

export function getRoleColorBadge(role?: string | null): { bg: string; text: string; border: string } {
  switch (role) {
    case 'SUPER_ADMIN':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'BRANCH_MANAGER_ADMINISTRATIVE':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'HR':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    case 'QUALITY_MANAGER':
    case 'TECHNICAL_MANAGER':
      return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' };
    case 'ADMIN_INWARD_CRE':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'ACCOUNTANT':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'TEST_ENGINEER':
    case 'LAB_ANALYST':
    case 'LAB_ASSISTANT':
    case 'SAMPLER':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    case 'MARKETING_EXECUTIVE':
    case 'DIGITAL_MARKETING':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    case 'DEVELOPER':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    default:
      return { bg: 'bg-zinc-50', text: 'text-zinc-700', border: 'border-zinc-200' };
  }
}
