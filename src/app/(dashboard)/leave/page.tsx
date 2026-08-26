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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium">
          Comp-Off Balance: <span className="font-bold">{compOffBalance}</span> hours
        </div>
      </div>
      
      <LeaveClientPage 
        myLeaves={myLeaves} 
        canApprove={canApprove} 
        leavesToApprove={leavesToApprove}
        isHR={isHR(user.roles) || isSuperAdmin(user.roles)}
      />
    </div>
  );
}
