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

    const testsData = data.jobEntryTests.map((t) => ({
      test_master_id: t.test_master_id,
      material_id: t.material_id,
      material_details_location: t.material_details_location,
      sample_quantity: t.sample_quantity,
      grade: t.grade,
      testing_day: t.testing_day,
      test_method: t.test_method,
      additional_details_values: t.additional_details_values || {},
    }));

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
