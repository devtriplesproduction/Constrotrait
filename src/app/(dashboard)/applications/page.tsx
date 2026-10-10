import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getMyApplications, getApplicationsToReview } from "@/services/employee-application.service";
import { redirect } from "next/navigation";
import { ApplicationsClientPage } from "@/components/modules/applications/ApplicationsClientPage";
import { isBranchManager, isHR, isSuperAdmin } from "@/config/roles";

export const metadata = {
  title: "Employee Applications | ConstroTrait",
};

export default async function ApplicationsPage() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    redirect("/login");
  }
  
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, designation, department")
    .eq("id", user.id)
    .single();

  const canApprove = isBranchManager(user.roles) || isHR(user.roles) || isSuperAdmin(user.roles);

  const [myRes, toApproveRes] = await Promise.all([
    getMyApplications(),
    canApprove ? getApplicationsToReview() : Promise.resolve({ success: true, data: [] })
  ]);

  const myApplications = myRes.success && myRes.data ? myRes.data : [];
  const applicationsToReview = toApproveRes.success && toApproveRes.data ? toApproveRes.data : [];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
      <ApplicationsClientPage
        myApplications={myApplications}
        canApprove={canApprove}
        applicationsToReview={applicationsToReview}
        userProfile={{
          first_name: profile?.first_name || "",
          last_name: profile?.last_name || "",
          designation: profile?.designation || "",
          department: profile?.department || "",
        }}
      />
    </div>
  );
}
