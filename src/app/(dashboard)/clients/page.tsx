import React, { Suspense } from "react";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getActiveBranchesAction } from "@/actions/branch.actions";
import { getTestsAction } from "@/actions/test.actions";
import { isSuperAdmin } from "@/config/roles";
import { ClientService } from "@/services/client.service";
import ClientInwardManager from "./components/ClientInwardManager";

export const metadata = {
  title: "Client Inward",
};

export default async function ClientsPage() {
  const user = await getAuthenticatedUserWithRoles();
  const [clients, branchesRes, testsRes] = await Promise.all([
    ClientService.getAllClients(),
    getActiveBranchesAction(),
    getTestsAction("all"),
  ]);

  const branches = branchesRes.success && branchesRes.data ? branchesRes.data : [];
  const tests = testsRes.success && testsRes.data ? testsRes.data : [];

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Client Inward...</div>}>
      <ClientInwardManager
        initialClients={clients}
        branches={branches}
        initialTests={tests}
        userBranchId={user?.branch_id}
        isSuperAdmin={isSuperAdmin(user?.roles || [])}
      />
    </Suspense>
  );
}
