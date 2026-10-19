import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getActiveBranchesAction } from "@/actions/branch.actions";
import { isSuperAdmin } from "@/config/roles";
import { ClientWizard } from "@/components/modules/clients/ClientWizard";

export const metadata = {
  title: "New Client | ConstroTrait",
  description: "Create a new client and test request",
};

export default async function NewClientPage() {
  const user = await getAuthenticatedUserWithRoles();
  const branchesRes = await getActiveBranchesAction();
  const branches = branchesRes.success && branchesRes.data ? branchesRes.data : [];

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-80px)] py-2 flex flex-col items-center justify-start">
      <ClientWizard
        branches={branches}
        userBranchId={user?.branch_id}
        isSuperAdmin={isSuperAdmin(user?.roles || [])}
      />
    </div>
  );
}
