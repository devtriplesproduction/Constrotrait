import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getLeaves, getCompOffBalance, getLeavesToApprove } from "@/services/leave.service";
import { redirect } from "next/navigation";
import { LeaveClientPage } from "@/components/modules/leave/LeaveClientPage";
import { isBranchManager, isHR, isSuperAdmin } from "@/config/roles";

export const metadata = {
  title: "Leave Management | ConstroTrait",
};

export default async function LeavePage() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    redirect("/login");
  }

  const [myLeavesRes, compOffRes, toApproveRes] = await Promise.all([
    getLeaves(),
    getCompOffBalance(user.id),
    getLeavesToApprove()
  ]);

  const myLeaves = myLeavesRes.success && myLeavesRes.data ? myLeavesRes.data : [];
  const compOffBalance = typeof compOffRes === 'number' ? compOffRes : 0;

  const canApprove = isBranchManager(user.roles) || isHR(user.roles) || isSuperAdmin(user.roles);
  const leavesToApprove = toApproveRes.success && toApproveRes.data ? toApproveRes.data : [];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <LeaveClientPage
        myLeaves={myLeaves}
        canApprove={canApprove}
        leavesToApprove={leavesToApprove}
        isHR={isHR(user.roles) || isSuperAdmin(user.roles)}
        compOffBalance={compOffBalance}
        isSuperAdmin={isSuperAdmin(user.roles)}
      />
    </div>
  );
}
