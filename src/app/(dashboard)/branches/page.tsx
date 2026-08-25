import React from "react";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getBranches } from "@/services/branch.service";
import { PageHeader } from "@/components/modules/PageHeader";
import { BranchTable } from "@/components/modules/branches/BranchTable";
import { AddBranchButton } from "@/components/modules/branches/AddBranchButton";

export const metadata = {
  title: "Branch Management | ConstroTrait",
  description: "Manage organizational branches.",
};

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const user = await getAuthenticatedUserWithRoles();
  
  if (!user || !user.roles.includes("SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  const { data: branches, success, error } = await getBranches();

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="Branch Management"
        subtitle="Manage company branches and monitor their activity."
        actions={<AddBranchButton />}
      />

      {!success && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
          Failed to load branches: {error}
        </div>
      )}

      {success && branches && branches.length > 0 ? (
        <BranchTable branches={branches} />
      ) : (
        success && (
          <div className="border border-dashed border-zinc-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center bg-zinc-50/50">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-800">No Branches Found</h3>
            <p className="text-sm text-zinc-500 mt-2 max-w-md">
              There are no branches defined in the system. Add your first branch to get started.
            </p>
          </div>
        )
      )}
    </div>
  );
}
