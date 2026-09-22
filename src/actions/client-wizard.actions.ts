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

    // 2. Create Job Entry and Job Entry Tests
    const jobData = {
      client_id: clientId,
    };

    const testsData = [{
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
    }];

    await JobEntryService.createJobEntryWithTests(jobData, testsData);

    revalidatePath("/dashboard"); 

    return { success: true };
  } catch (error) {
    console.error("Wizard submission error:", error);
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
