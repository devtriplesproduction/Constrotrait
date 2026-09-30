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
        division: data.client.division,
        site_name: data.client.site_name,
        agency_name: data.client.agency_name,
        project_name: data.client.project_name,
        dispatch_name: data.client.dispatch_name,
        dispatch_address: data.client.dispatch_address,
        contact_person: data.client.contact_person,
        mobile: data.client.mobile,
        email: data.client.email,
        collected_by: data.client.collected_by,
        gst_no: data.client.gst_no,
      });
    } else {
      const newClient = await ClientService.createClient({
        name: data.client.name,
        address: data.client.address,
        division: data.client.division,
        site_name: data.client.site_name,
        agency_name: data.client.agency_name,
        project_name: data.client.project_name,
        dispatch_name: data.client.dispatch_name,
        dispatch_address: data.client.dispatch_address,
        contact_person: data.client.contact_person,
        mobile: data.client.mobile,
        email: data.client.email,
        collected_by: data.client.collected_by,
        gst_no: data.client.gst_no,
      });
      clientId = newClient.id;
    }

    if (!clientId) throw new Error("Failed to resolve client ID.");

    const testsData: any[] =
      data.jobEntryTests && data.jobEntryTests.length > 0
        ? data.jobEntryTests.map((test: any) => ({
            test_master_id: toNull(test.test_master_id),
            material_id: toNull(test.material_id),
            material_details_location: test.material_details_location || null,
            sample_quantity: test.sample_quantity || null,
            grade: test.grade || null,
            testing_day: test.testing_day || null,
            test_method: test.test_method || null,
            date_of_receiving: toNull(test.date_of_receiving),
            date_of_casting: toNull(test.date_of_casting),
            testing_age: test.testing_age || null,
            date_of_testing: toNull(test.date_of_testing),
            material_description: test.material_description || null,
            additional_details_values: test.additional_details_values || {},
          }))
        : [
            {
              test_master_id: null,
              material_id: null,
              material_details_location: null,
              sample_quantity: null,
              grade: null,
              testing_day: null,
              test_method: null,
              date_of_receiving: null,
              date_of_casting: null,
              testing_age: null,
              date_of_testing: null,
              material_description: null,
              additional_details_values: {},
            },
          ];

    await JobEntryService.createJobEntryWithTests({ client_id: clientId }, testsData);

    revalidatePath("/dashboard");
    revalidatePath("/clients");
    return { success: true, uids: [] };
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
      division: data.client.division,
      site_name: data.client.site_name,
      agency_name: data.client.agency_name,
      project_name: data.client.project_name,
      dispatch_name: data.client.dispatch_name,
      dispatch_address: data.client.dispatch_address,
      contact_person: data.client.contact_person,
      mobile: data.client.mobile,
      email: data.client.email,
      collected_by: data.client.collected_by,
      gst_no: data.client.gst_no,
    });
    const jobEntryTest = data.jobEntryTests[0];
    if (jobEntryTest) {
      await JobEntryService.updateJobEntryTest(testId, {
        test_master_id: toNull(jobEntryTest.test_master_id),
        material_id: toNull(jobEntryTest.material_id),
        material_details_location: jobEntryTest.material_details_location,
        sample_quantity: jobEntryTest.sample_quantity,
        grade: jobEntryTest.grade,
        testing_day: jobEntryTest.testing_day,
        test_method: jobEntryTest.test_method,
        date_of_receiving: toNull(jobEntryTest.date_of_receiving),
        date_of_casting: toNull(jobEntryTest.date_of_casting),
        testing_age: jobEntryTest.testing_age,
        date_of_testing: toNull(jobEntryTest.date_of_testing),
        material_description: jobEntryTest.material_description,
        additional_details_values: jobEntryTest.additional_details_values || {},
      });
    }
    revalidatePath("/dashboard");
    revalidatePath("/clients");
    return { success: true };
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
      return { success: true, nextUid: (counterData.counter_value || 0) + 1 };
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
