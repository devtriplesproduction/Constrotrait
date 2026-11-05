import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { 
  DeliveryChallan, 
  CreateDeliveryChallanInput,
  StaffMember
} from "@/types/delivery-challan";

export async function getDeliveryChallans() {
  const supabase = await createClient();
  const user = await getAuthenticatedUserWithRoles();
  if (!user) return { success: false, error: "Not authenticated", data: [] };

  const { data, error } = await supabase
    .from("delivery_challans")
    .select(`
      *,
      creator_profile:created_by (
        first_name,
        last_name,
        designation
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching delivery challans:", error.message || error);
    return { success: false, error: error.message, data: [] };
  }

  // Parse items JSON safely
  const formattedData: DeliveryChallan[] = (data || []).map((row: any) => ({
    ...row,
    items: Array.isArray(row.items) ? row.items : [],
  }));

  return { success: true, data: formattedData };
}

export async function getDeliveryChallanById(id: string) {
  const supabase = await createClient();
  const user = await getAuthenticatedUserWithRoles();
  if (!user) return { success: false, error: "Not authenticated", data: null };

  const { data, error } = await supabase
    .from("delivery_challans")
    .select(`
      *,
      creator_profile:created_by (
        first_name,
        last_name,
        designation
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching delivery challan by ID:", error);
    return { success: false, error: error.message, data: null };
  }

  const challan: DeliveryChallan = {
    ...(data as any),
    items: Array.isArray((data as any).items) ? (data as any).items : [],
  };

  return { success: true, data: challan };
}

export async function getNextChallanNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `DC-${year}-`;

  const { data, error } = await supabase
    .from("delivery_challans")
    .select("challan_no")
    .ilike("challan_no", `${prefix}%`)
    .order("challan_no", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return `${prefix}0001`;
  }

  const lastNo = data[0]?.challan_no || "";
  const parts = lastNo.split("-");
  const lastSeq = parseInt(parts[parts.length - 1], 10);
  if (isNaN(lastSeq)) {
    return `${prefix}0001`;
  }

  const nextSeq = String(lastSeq + 1).padStart(4, "0");
  return `${prefix}${nextSeq}`;
}

export async function getActiveClientsForChallan() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, company_name, project_name, site_name, contact_person, mobile, agency_name")
    .order("name", { ascending: true })
    .limit(1000);

  if (error) {
    console.error("Error fetching clients for challan:", error.message || error);
    return [];
  }

  return data || [];
}

export async function getActiveStaffForChallan(): Promise<StaffMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, employee_id, designation, department, phone_number, email")
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching staff for challan:", error);
    return [];
  }
  return (data || []).map((p: any) => ({
    ...p,
    first_name: p.first_name || "",
    last_name: p.last_name || "",
  }));
}

export async function createDeliveryChallan(data: CreateDeliveryChallanInput) {
  const supabase = await createClient();
  const user = await getAuthenticatedUserWithRoles();
  if (!user) return { success: false, error: "Not authenticated" };

  // Ensure items have proper serial numbers
  const cleanedItems = (data.items || []).map((item, index) => ({
    sr_no: index + 1,
    material_description: item.material_description?.trim() || "",
    quantity: item.quantity?.trim() || "",
    remarks: item.remarks?.trim() || "",
  })).filter(item => item.material_description.length > 0);

  const { data: inserted, error } = await supabase
    .from("delivery_challans")
    .insert([
      {
        challan_no: data.challan_no.trim(),
        challan_date: data.challan_date,
        client_id: data.client_id || null,
        customer_name: data.customer_name.trim(),
        project_site_name: data.project_site_name?.trim() || null,
        material_taken_by: data.material_taken_by.trim(),
        company_agency_name: data.company_agency_name?.trim() || null,
        mobile_no: data.mobile_no?.trim() || null,
        purpose_of_handover: data.purpose_of_handover,
        purpose_other: data.purpose_other?.trim() || null,
        items: cleanedItems,
        receiver_name: data.receiver_name.trim(),
        receiver_signature_date: data.receiver_signature_date || null,
        issued_by_name: data.issued_by_name.trim(),
        issued_by_signature_date: data.issued_by_signature_date || null,
        verified_by_name: data.verified_by_name?.trim() || null,
        created_by: user.id,
      },
    ])
    .select(`
      *,
      creator_profile:created_by (
        first_name,
        last_name,
        designation
      )
    `)
    .single();

  if (error) {
    console.error("Error creating delivery challan:", error);
    return { success: false, error: error.message };
  }

  return { 
    success: true, 
    data: {
      ...(inserted as any),
      items: Array.isArray((inserted as any).items) ? (inserted as any).items : [],
    } as DeliveryChallan 
  };
}

export async function deleteDeliveryChallan(id: string) {
  const supabase = await createClient();
  const user = await getAuthenticatedUserWithRoles();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("delivery_challans")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting delivery challan:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
