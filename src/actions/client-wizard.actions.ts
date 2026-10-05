"use server";

import { ClientService } from "@/services/client.service";
import { JobEntryService } from "@/services/job-entry.service";
import { ClientWizardValues } from "@/lib/validations/client-wizard";
import { revalidatePath } from "next/cache";

const toNull = (v: string | null | undefined) => (v && v.trim() !== "" ? v : null);

export async function submitClientWizard(data: ClientWizardValues) {
  try {
    let clientId = data.client.id;

    if (clientId) {
      await ClientService.updateClient(clientId, {
        name: data.client.name,
        address: data.client.address,
        mobile: data.client.mobile,
        email: data.client.email,
        gst_no: data.client.gst_no,
        company_name: data.client.company_name,
        division: data.jobEntry.division,
        site_name: data.jobEntry.site_name,
        agency_name: data.jobEntry.agency_name,
        project_name: data.jobEntry.project_name,
        dispatch_name: data.jobEntry.dispatch_name,
        dispatch_address: data.jobEntry.dispatch_address,
        contact_person: data.jobEntry.contact_person,
        collected_by: data.jobEntry.collected_by,
      });
    } else {
      const newClient = await ClientService.createClient({
        name: data.client.name,
        address: data.client.address,
        mobile: data.client.mobile,
        email: data.client.email,
        gst_no: data.client.gst_no,
        company_name: data.client.company_name,
        division: data.jobEntry.division,
        site_name: data.jobEntry.site_name,
        agency_name: data.jobEntry.agency_name,
        project_name: data.jobEntry.project_name,
        dispatch_name: data.jobEntry.dispatch_name,
        dispatch_address: data.jobEntry.dispatch_address,
        contact_person: data.jobEntry.contact_person,
        collected_by: data.jobEntry.collected_by,
      });
      clientId = newClient.id;
    }

    if (!clientId) throw new Error("Failed to resolve client ID.");

    const testsData: any[] =
      data.jobEntryTests && data.jobEntryTests.length > 0
        ? data.jobEntryTests.map((test: any) => ({
            test_master_id: toNull(test.test_master_id),
            date_of_receiving: toNull(data.materialDetails?.date_of_receiving),
            testing_age: test.testing_age || null,
            date_of_testing: toNull(test.date_of_testing),
            material_description: test.material_description || null,
            material_id: data.materialDetails?.material_id || null,
            material_details_location: data.materialDetails?.material_details_location || null,
            sample_quantity: data.materialDetails?.sample_quantity || null,
            testing_day: data.materialDetails?.testing_day || null,
            date_of_casting: toNull(data.materialDetails?.date_of_casting),
            additional_details_values: test.additional_details_values || {},
            test_method: test.test_method || null,
            grade: data.materialDetails?.grade || test.grade || test.additional_details_values?.Grade || test.additional_details_values?.grade || null,
          }))
        : [];

    const jobEntryData = {
      client_id: clientId,
      division: data.jobEntry.division,
      agency: data.jobEntry.agency_name,
      project_name: data.jobEntry.project_name,
      dispatch_name: data.jobEntry.dispatch_name,
      dispatch_address: data.jobEntry.dispatch_address,
      collected_by: data.jobEntry.collected_by,
      invoice_no: data.jobEntry.invoice_no,
      invoice_date: data.jobEntry.invoice_date,
      letter_reference: data.jobEntry.letter_reference,
      payment_status: data.jobEntry.payment_status,
    };

    const { uidsIssued } = await JobEntryService.createJobEntryWithTests(jobEntryData, testsData, data.dummy_is_nabl, data.dummy_scheduled_days);

    revalidatePath("/dashboard");
    revalidatePath("/clients");
    return { success: true, uids: uidsIssued || [] };
  } catch (error) {
    console.error("Wizard submission error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateClientWizardAction(data: ClientWizardValues, testId: string) {
  try {
    const clientId = data.client.id;
    if (!clientId) throw new Error("Client ID is required for updating");
    await ClientService.updateClient(clientId, {
      name: data.client.name,
      address: data.client.address,
      mobile: data.client.mobile,
      email: data.client.email,
      gst_no: data.client.gst_no,
      company_name: data.client.company_name,
      division: data.jobEntry.division,
      site_name: data.jobEntry.site_name,
      agency_name: data.jobEntry.agency_name,
      project_name: data.jobEntry.project_name,
      dispatch_name: data.jobEntry.dispatch_name,
      dispatch_address: data.jobEntry.dispatch_address,
      contact_person: data.jobEntry.contact_person,
      collected_by: data.jobEntry.collected_by,
    });
    
    // In edit mode we only update the test, we'll leave job_entries fields untouched for now
    // as JobEntryService.updateJobEntryTest only takes testData.
    // If needed we'd create a JobEntryService.updateJobEntry.

    const jobEntryTest = data.jobEntryTests[0];
    if (jobEntryTest) {
      await JobEntryService.updateJobEntryTest(testId, {
        test_master_id: toNull(jobEntryTest.test_master_id),
        date_of_receiving: toNull(data.materialDetails?.date_of_receiving ?? jobEntryTest.date_of_receiving),
        testing_age: jobEntryTest.testing_age,
        date_of_testing: toNull(jobEntryTest.date_of_testing),
        material_description: jobEntryTest.material_description,
        material_id: data.materialDetails?.material_id ?? jobEntryTest.material_id,
        material_details_location: data.materialDetails?.material_details_location ?? jobEntryTest.material_details_location,
        sample_quantity: data.materialDetails?.sample_quantity ?? jobEntryTest.sample_quantity,
        testing_day: data.materialDetails?.testing_day ?? jobEntryTest.testing_day,
        date_of_casting: toNull(data.materialDetails?.date_of_casting ?? jobEntryTest.date_of_casting),
        additional_details_values: jobEntryTest.additional_details_values || {},
        test_method: jobEntryTest.test_method,
        grade: data.materialDetails?.grade ?? jobEntryTest.grade ?? jobEntryTest.additional_details_values?.Grade ?? jobEntryTest.additional_details_values?.grade ?? null,
      });
    }
    revalidatePath("/dashboard");
    revalidatePath("/clients");
    revalidatePath("/", "layout");
    return { success: true, uids: [] };
  } catch (error) {
    console.error("Wizard update error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function searchClientsAction(query: string) {
  try {
    const clients = await ClientService.searchClients(query);
    return { success: true, data: clients };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getClientProjectsAction(clientId: string) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("job_entries")
      .select("project_name, division, agency, dispatch_name, dispatch_address, collected_by")
      .eq("client_id", clientId)
      .not("project_name", "is", null)
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    
    // Deduplicate by project_name
    const uniqueProjects = Array.from(new Map(data.filter(d => d.project_name).map(item => [item.project_name, item])).values());
    
    return { success: true, data: uniqueProjects };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getNextUidAction() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    
    // Try lab_uid_counters first
    const { data: counterData, error: counterError } = await supabase
      .from("lab_uid_counters" as any)
      .select("counter_value")
      .eq("counter_name", "UID_NABL")
      .maybeSingle();
      
    if (!counterError && counterData) {
      return { success: true, nextUid: ((counterData as any).counter_value || 0) + 1 };
    }

    // Fallback to max numeric uid_label
    const { data: testsData } = await supabase
      .from("job_entry_tests")
      .select("uid_label")
      .not("uid_label", "is", null);

    let maxVal = 0;
    if (testsData) {
      for (const t of testsData) {
        if (t.uid_label && /^\d+$/.test(t.uid_label)) {
          const val = parseInt(t.uid_label, 10);
          if (val > maxVal) maxVal = val;
        }
      }
    }
    return { success: true, nextUid: maxVal + 1 };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function createDummyJobCardAction(isNabl: boolean) {
  try {
    const jobEntry = await JobEntryService.createDummyJobCard(isNabl);
    revalidatePath('/dashboard');
    revalidatePath('/clients');
    return { success: true, data: jobEntry };
  } catch (error) {
    console.error('Create dummy job card error:', error);
    return { success: false, error: (error as Error).message };
  }
}
