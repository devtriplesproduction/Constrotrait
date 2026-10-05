import { AppRole, isSuperAdmin, isBranchManager, isHR, isTestEngineer } from "./roles";

export type JobStage = 
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'in_testing'
  | 'report_uploaded'
  | 'in_review'
  | 'approved'
  | 'rejected';

export function canTransition(from: JobStage, to: JobStage, roles: string[] | null | undefined): boolean {
  if (!roles) return false;
  
  const isSuperAdminOrBranchManager = isSuperAdmin(roles) || isBranchManager(roles);
  const isTestEng = isTestEngineer(roles) || isSuperAdminOrBranchManager;
  const isHRRole = isHR(roles);

  // HR is read-only
  if (isHRRole && !isSuperAdminOrBranchManager) return false;

  // Super Admin & Branch Manager can assign, approve, reject
  if (isSuperAdminOrBranchManager) {
    if (from === 'pending' && to === 'assigned') return true;
    if (from === 'report_uploaded' && to === 'in_review') return true;
    if (from === 'in_review' && to === 'approved') return true;
    if (from === 'in_review' && to === 'rejected') return true;
    if (from === 'rejected' && to === 'in_testing') return true; // send back
  }

  // Test Engineer can accept, start testing, upload report
  if (isTestEng) {
    if (from === 'assigned' && to === 'accepted') return true;
    if (from === 'accepted' && to === 'in_testing') return true;
    if (from === 'in_testing' && to === 'report_uploaded') return true;
    if (from === 'in_testing' && to === 'in_review') return true;
    if (from === 'report_uploaded' && to === 'in_review') return true;
    if (from === 'rejected' && to === 'in_testing') return true;
    if (from === 'rejected' && to === 'report_uploaded') return true;
  }

  return false;
}
