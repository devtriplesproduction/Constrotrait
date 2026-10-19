import React from "react";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getTestsAction } from "@/actions/test.actions";
import { getActiveBranchesAction } from "@/actions/branch.actions";
import { isSuperAdmin } from "@/config/roles";
import { TestMasterClient } from "@/components/modules/tests/TestMasterClient";

export const metadata = {
  title: "Create Test- ConstroTrait",
};

export default async function TestsPage() {
  const user = await getAuthenticatedUserWithRoles();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const [testsResult, branchesResult] = await Promise.all([
    getTestsAction(),
    getActiveBranchesAction(),
  ]);

  const branches = branchesResult.success && branchesResult.data ? branchesResult.data : [];

  return (
    <>
      <TestMasterClient
        initialTests={testsResult.success && testsResult.data ? testsResult.data : []}
        branches={branches}
        userBranchId={user.branch_id}
        isSuperAdmin={isSuperAdmin(user.roles)}
      />
    </>
  );
}
