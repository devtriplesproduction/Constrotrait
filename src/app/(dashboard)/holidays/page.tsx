import React from "react";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getHolidays } from "@/services/holiday.service";
import { getBranches } from "@/services/branch.service";
import { HolidayList } from "@/components/modules/holidays/HolidayList";
import { isHR, isSuperAdmin, isBranchManager } from "@/config/roles";

export const metadata = {
  title: "Holiday Calendar - ConstroTrait",
};

export default async function HolidaysPage() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    return <div>Unauthorized</div>;
  }

  const [holidaysResult, branchesResult] = await Promise.all([
    getHolidays(),
    getBranches(),
  ]);

  const isSuperAdminUser = isSuperAdmin(user.roles);
  const isHRUser = isHR(user.roles);
  const isBranchManagerUser = isBranchManager(user.roles);
  
  const canAdd = isSuperAdminUser || isHRUser || isBranchManagerUser;
  const canEditDelete = isSuperAdminUser || isHRUser;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <HolidayList 
        initialHolidays={holidaysResult.data || []} 
        branches={branchesResult.data || []}
        canAdd={canAdd}
        canEditDelete={canEditDelete}
        isSuperAdmin={isSuperAdminUser}
        isHR={isHRUser}
        isBranchManager={isBranchManagerUser}
      />
    </div>
  );
}
