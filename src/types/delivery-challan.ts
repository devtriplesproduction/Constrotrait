export interface DeliveryChallanItem {
  sr_no: number;
  material_description: string;
  quantity: string;
  remarks: string;
}

export type HandoverPurpose =
  | "Customer Material Handover"
  | "Material Taken for Testing"
  | "Material Collected from Lab"
  | "Other";

export interface DeliveryChallan {
  id: string;
  challan_no: string;
  challan_date: string;
  client_id: string | null;
  customer_name: string;
  project_site_name: string | null;
  material_taken_by: string;
  company_agency_name: string | null;
  mobile_no: string | null;
  purpose_of_handover: HandoverPurpose | string;
  purpose_other: string | null;
  items: DeliveryChallanItem[];
  receiver_name: string;
  receiver_signature_date: string | null;
  issued_by_name: string;
  issued_by_signature_date: string | null;
  verified_by_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    first_name: string;
    last_name: string;
    designation?: string;
  };
}

export interface CreateDeliveryChallanInput {
  challan_no: string;
  challan_date: string;
  client_id?: string | null;
  customer_name: string;
  project_site_name?: string | null;
  material_taken_by: string;
  company_agency_name?: string | null;
  mobile_no?: string | null;
  purpose_of_handover: string;
  purpose_other?: string | null;
  items: DeliveryChallanItem[];
  receiver_name: string;
  receiver_signature_date?: string | null;
  issued_by_name: string;
  issued_by_signature_date?: string | null;
  verified_by_name?: string | null;
}

export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  employee_id?: string | null;
  designation?: string | null;
  department?: string | null;
  phone_number?: string | null;
  email?: string | null;
}
