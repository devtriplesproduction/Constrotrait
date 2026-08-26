import React from "react";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getHolidays } from "@/services/holiday.service";
import { getBranches } from "@/services/branch.service";
import { HolidayList } from "@/components/modules/holidays/HolidayList";
import { isHR, isSuperAdmin } from "@/config/roles";

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

  const canManage = isHR(user.roles) || isSuperAdmin(user.roles);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <HolidayList 
        initialHolidays={holidaysResult.data || []} 
        branches={branchesResult.data || []}
        canManage={canManage}
      />
    </div>
  );
}
