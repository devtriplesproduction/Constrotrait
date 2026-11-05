import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { getCurrentUserProfile } from "@/services/employee.service";
import { 
  getActiveClientsForChallan, 
  getActiveStaffForChallan, 
  getNextChallanNumber 
} from "@/services/delivery-challan.service";
import { redirect } from "next/navigation";
import { DeliveryChallanWizard } from "@/components/modules/delivery-challans/DeliveryChallanWizard";

export const metadata = {
  title: "New Delivery Voucher | ConstroTrait",
  description: "Create a new material handover delivery voucher / challan",
};

export const dynamic = "force-dynamic";

export default async function NewDeliveryChallanPage() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    redirect("/login");
  }

  const [profileRes, clients, staff, nextChallanNo] = await Promise.all([
    getCurrentUserProfile(),
    getActiveClientsForChallan(),
    getActiveStaffForChallan(),
    getNextChallanNumber(),
  ]);

  const profile = profileRes.success && profileRes.data
    ? (profileRes.data as unknown as { first_name?: string; last_name?: string; designation?: string; department?: string })
    : null;

  return (
    <div className="w-full max-w-6xl mx-auto py-3 sm:py-6 px-2 sm:px-4">
      <DeliveryChallanWizard
        initialChallanNo={nextChallanNo}
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
