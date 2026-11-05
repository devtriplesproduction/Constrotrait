import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getCurrentUserProfile } from "@/services/employee.service";
import { 
  getDeliveryChallans, 
  getActiveClientsForChallan,
  getActiveStaffForChallan
} from "@/services/delivery-challan.service";
import { redirect } from "next/navigation";
import { DeliveryChallansClientPage } from "@/components/modules/delivery-challans/DeliveryChallansClientPage";
import { isBranchManager, isSuperAdmin } from "@/config/roles";

export const metadata = {
  title: "Delivery Challan | ConstroTrait",
  description: "Official Material Handover and Delivery Challan Management.",
};

export const dynamic = "force-dynamic";

export default async function DeliveryChallanPage() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    redirect("/login");
  }

  const canManage = isSuperAdmin(user.roles) || isBranchManager(user.roles) || true; // Lab staff & admins can manage challans

  const [profileRes, challansRes, clients, staff] = await Promise.all([
    getCurrentUserProfile(),
    getDeliveryChallans(),
    getActiveClientsForChallan(),
    getActiveStaffForChallan(),
  ]);

  const profile = profileRes.success && profileRes.data
    ? (profileRes.data as unknown as { first_name?: string; last_name?: string; designation?: string; department?: string })
    : null;

  const challans = challansRes.success && challansRes.data ? challansRes.data : [];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <DeliveryChallansClientPage
        challans={challans}
        canManage={canManage}
        clients={clients}
        staff={staff}
        userProfile={{
          first_name: profile?.first_name || "",
          last_name: profile?.last_name || "",
          designation: profile?.designation || "",
        }}
      />
    </div>
  );
}
