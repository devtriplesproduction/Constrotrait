import React from "react";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getActiveBranchesAction } from "@/actions/branch.actions";
import { isSuperAdmin } from "@/config/roles";
import { ClientService } from "@/services/client.service";
import ClientInwardManager from "./components/ClientInwardManager";

export const metadata = {
  title: "Client Inward",
};

export default async function ClientsPage() {
  const user = await getAuthenticatedUserWithRoles();
  const [clients, branchesRes] = await Promise.all([
    ClientService.getAllClients(),
    getActiveBranchesAction(),
  ]);

  const branches = branchesRes.success && branchesRes.data ? branchesRes.data : [];

  return (
    <ClientInwardManager
      initialClients={clients}
      branches={branches}
      userBranchId={user?.branch_id}
      isSuperAdmin={isSuperAdmin(user?.roles || [])}
    />
  );
}
