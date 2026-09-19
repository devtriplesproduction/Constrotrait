import React from "react";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getTestsAction } from "@/actions/test.actions";
import { TestMasterClient } from "@/components/modules/tests/TestMasterClient";

export const metadata = {
  title: "Test Master - ConstroTrait",
};

export default async function TestsPage() {
  const user = await getAuthenticatedUserWithRoles();
  
  if (!user) {
    return <div>Unauthorized</div>;
  }

  const result = await getTestsAction();
  
  return (
    <>
      <TestMasterClient initialTests={result.success && result.data ? result.data : []} />
    </>
  );
}
