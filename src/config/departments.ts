import { AppRole, APP_ROLES } from './roles';

export interface DesignationConfig {
  id: AppRole;
  name: string;
}

export interface DepartmentConfig {
  id: string;
  name: string;
  designations: DesignationConfig[];
}

export const DEPARTMENTS: DepartmentConfig[] = [
  {
    id: 'management',
    name: 'Management & Administration',
    designations: [
      { id: 'BRANCH_MANAGER_ADMINISTRATIVE', name: APP_ROLES.BRANCH_MANAGER_ADMINISTRATIVE },
      { id: 'ADMIN_INWARD_CRE', name: APP_ROLES.ADMIN_INWARD_CRE }
    ]
  },
  {
    id: 'hr',
    name: 'Human Resources',
    designations: [
      { id: 'HR', name: APP_ROLES.HR }
    ]
  },
  {
    id: 'finance',
    name: 'Finance & Accounts',
    designations: [
      { id: 'ACCOUNTANT', name: APP_ROLES.ACCOUNTANT }
    ]
  },
  {
    id: 'quality_technical',
    name: 'Quality & Technical',
    designations: [
      { id: 'QUALITY_MANAGER', name: APP_ROLES.QUALITY_MANAGER },
      { id: 'TECHNICAL_MANAGER', name: APP_ROLES.TECHNICAL_MANAGER }
    ]
  },
  {
    id: 'laboratory',
    name: 'Laboratory & Testing',
    designations: [
      { id: 'TEST_ENGINEER', name: APP_ROLES.TEST_ENGINEER },
      { id: 'LAB_ANALYST', name: APP_ROLES.LAB_ANALYST },
      { id: 'LAB_ASSISTANT', name: APP_ROLES.LAB_ASSISTANT },
      { id: 'SAMPLER', name: APP_ROLES.SAMPLER }
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing & Sales',
    designations: [
      { id: 'MARKETING_EXECUTIVE', name: APP_ROLES.MARKETING_EXECUTIVE },
      { id: 'DIGITAL_MARKETING', name: APP_ROLES.DIGITAL_MARKETING }
    ]
  }
];

export function getDesignationsForDepartment(deptId: string): DesignationConfig[] {
  if (!deptId) return [];
  return DEPARTMENTS.find((d) => d.id === deptId)?.designations || [];
}

export function getSystemRoleForDesignation(deptId: string, designationId: string): AppRole {
  return designationId as AppRole;
}

