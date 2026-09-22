"use server";

import { ClientService } from "@/services/client.service";
import { JobEntryService } from "@/services/job-entry.service";
import { ClientWizardValues } from "@/lib/validations/client-wizard";
import { revalidatePath } from "next/cache";

export async function submitClientWizard(data: ClientWizardValues) {
  try {
    let clientId = data.client.id;

    // 1. Create or Update Client
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

    if (!clientId) {
      throw new Error("Failed to resolve client ID.");
    }

    let uids: string[] = [];

    // 2. Create Job Entry
    const jobData = {
      client_id: clientId,
    };

    let testsData: any[] = [{
      test_master_id: data.jobEntryTest?.test_master_id || null,
      material_id: data.jobEntryTest?.material_id || null,
      material_details_location: data.jobEntryTest?.material_details_location || null,
      sample_quantity: data.jobEntryTest?.sample_quantity || null,
      grade: data.jobEntryTest?.grade || null,
      testing_day: data.jobEntryTest?.testing_day || null,
      test_method: data.jobEntryTest?.test_method || null,
      date_of_receiving: data.jobEntryTest?.date_of_receiving || null,
      date_of_casting: data.jobEntryTest?.date_of_casting || null,
      testing_age: data.jobEntryTest?.testing_age || null,
      date_of_testing: data.jobEntryTest?.date_of_testing || null,
      material_description: data.jobEntryTest?.material_description || null,
      additional_details_values: data.jobEntryTest?.additional_details_values || {},
    }];

    const result = await JobEntryService.createJobEntryWithTests(jobData, testsData);
    if (result.jobEntryTests && result.jobEntryTests.length > 0) {
      uids = result.jobEntryTests.map(t => t.uid);
    }

    revalidatePath("/dashboard"); 

    return { 
      success: true, 
      uids
    };
  } catch (error) {
    console.error("Wizard submission error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateClientWizardAction(data: ClientWizardValues, testId: string) {
  try {
    const clientId = data.client.id;
    if (!clientId) throw new Error("Client ID is required for updating");

    // 1. Update Client
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

    // 2. Update Job Entry Test
    await JobEntryService.updateJobEntryTest(testId, {
      test_master_id: data.jobEntryTest.test_master_id,
      material_id: data.jobEntryTest.material_id,
      material_details_location: data.jobEntryTest.material_details_location,
      sample_quantity: data.jobEntryTest.sample_quantity,
      grade: data.jobEntryTest.grade,
      testing_day: data.jobEntryTest.testing_day,
      test_method: data.jobEntryTest.test_method,
      date_of_receiving: data.jobEntryTest.date_of_receiving,
      date_of_casting: data.jobEntryTest.date_of_casting,
      testing_age: data.jobEntryTest.testing_age,
      date_of_testing: data.jobEntryTest.date_of_testing,
      material_description: data.jobEntryTest.material_description,
      additional_details_values: data.jobEntryTest.additional_details_values || {},
    });

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
    
    // Get the maximum UID currently in the database
    const { data, error } = await supabase
      .from('job_entry_tests')
      .select('uid')
      .order('uid', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching next UID:", error);
      return { success: false, error: error.message };
    }

    const nextUid = (data?.uid || 0) + 1;
    return { success: true, nextUid };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
