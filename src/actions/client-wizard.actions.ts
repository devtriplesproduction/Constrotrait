"use server";

import { ClientService } from "@/services/client.service";
import { JobEntryService } from "@/services/job-entry.service";
import { ClientWizardValues } from "@/lib/validations/client-wizard";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const toNull = (v: string | null | undefined) => (v && v.trim() !== "" ? v : null);

export async function submitClientWizard(data: ClientWizardValues) {
  try {
    let clientId = data.client.id;
    const branchId = data.jobEntry?.branch_id || data.client?.branch_id;

    if (clientId) {
      await ClientService.updateClient(clientId, {
        name: data.client.name,
        address: data.client.address,
        mobile: data.client.mobile,
        email: data.client.email,
        gst_no: data.client.gst_no,
        company_name: data.client.company_name,
        branch_id: branchId,
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
        branch_id: branchId,
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
            testing_day: test.testing_day || data.materialDetails?.testing_day || null,
            date_of_casting: toNull(test.date_of_casting || data.materialDetails?.date_of_casting),
            additional_details_values: test.additional_details_values || {},
            test_method: test.test_method || null,
            grade: data.materialDetails?.grade || test.grade || test.additional_details_values?.Grade || test.additional_details_values?.grade || null,
          }))
        : [];

    const jobEntryData = {
      client_id: clientId,
      branch_id: branchId,
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

    const testInitials = (data.materialDetails as any)?.test_initials || data.materialDetails?.material_initials;
    const { uidsIssued } = await JobEntryService.createJobEntryWithTests(jobEntryData, testsData, data.dummy_is_nabl, data.dummy_scheduled_days, data.non_nabl_month, testInitials);

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
      const rawAddVals: Record<string, any> = { ...(jobEntryTest.additional_details_values || {}) };
      const materialInitials = ((data.materialDetails as any)?.test_initials || data.materialDetails?.material_initials)?.trim();

      if (materialInitials !== undefined && materialInitials !== null) {
        rawAddVals.test_initials = materialInitials;
        rawAddVals.material_initials = materialInitials;

        if (materialInitials) {
          if (rawAddVals.sample_code_no) {
            const codes = String(rawAddVals.sample_code_no).split(/,\s*(?=CMTS\/)/);
            rawAddVals.sample_code_no = codes.map((code: string) =>
              code.replace(/^(CMTS\/(?:CON|ENV)\/)[^\/]+(\/\d{2}-\d{2}\/.*)$/, (m, p1, p2) => `${p1}${materialInitials}${p2}`)
            ).join(', ');
          } else {
            const supabase = await createClient() as any;
            const { data: currentTest } = await supabase
              .from("job_entry_tests")
              .select("job_entry_id, test_master_id, job_entries (created_at)")
              .eq("id", testId)
              .single();

            if (currentTest?.job_entry_id) {
              const { data: siblings } = await supabase
                .from("job_entry_tests")
                .select("additional_details_values")
                .eq("job_entry_id", currentTest.job_entry_id);

              let siblingCode: string | null = null;
              if (siblings) {
                for (const s of siblings) {
                  const sc = (s.additional_details_values as any)?.sample_code_no;
                  if (sc) {
                    siblingCode = sc;
                    break;
                  }
                }
              }

              if (siblingCode) {
                const codes = String(siblingCode).split(/,\s*(?=CMTS\/)/);
                rawAddVals.sample_code_no = codes.map((c: string) =>
                  c.replace(/^(CMTS\/(?:CON|ENV)\/)[^\/]+(\/\d{2}-\d{2}\/.*)$/, (m, p1, p2) => `${p1}${materialInitials}${p2}`)
                ).join(', ');
              } else {
                const jobYear = currentTest.job_entries?.created_at
                  ? new Date(currentTest.job_entries.created_at).getFullYear()
                  : new Date().getFullYear();

                let category = 'CON';
                const tmId = jobEntryTest.test_master_id || currentTest.test_master_id;
                if (tmId) {
                  const { data: tm } = await supabase.from("test_master").select("category").eq("id", tmId).single();
                  if (tm?.category === 'Environmental') category = 'ENV';
                }

                const yy = jobYear.toString().slice(-2);
                const nextYy = (jobYear + 1).toString().slice(-2);
                const yearSegment = `${yy}-${nextYy}`;
                const seqName = category === 'ENV' ? 'SAMPLE_ENV' : 'SAMPLE_CON';
                const { data: sampleData, error: sampleError } = await supabase.rpc("next_uid_seq", { p_name: seqName, p_year: jobYear });
                if (!sampleError && sampleData) {
                  const sampleNo = sampleData.toString();
                  const sampleQuantityStr = data.materialDetails?.sample_quantity || jobEntryTest.sample_quantity || "1";
                  const sampleQuantityMatch = sampleQuantityStr.match(/\d+/);
                  let qty = sampleQuantityMatch ? parseInt(sampleQuantityMatch[0], 10) : 1;
                  if (isNaN(qty) || qty <= 0) qty = 1;

                  const sampleCodes: string[] = [];
                  for (let i = 1; i <= qty; i++) {
                    sampleCodes.push(`CMTS/${category}/${materialInitials}/${yearSegment}/${sampleNo}-${JobEntryService.toRoman(i)}`);
                  }
                  rawAddVals.sample_code_no = sampleCodes.join(', ');
                }
              }
            }
          }
        }
      }

      await JobEntryService.updateJobEntryTest(testId, {
        test_master_id: toNull(jobEntryTest.test_master_id),
        date_of_receiving: toNull(data.materialDetails?.date_of_receiving ?? jobEntryTest.date_of_receiving),
        testing_age: jobEntryTest.testing_age,
        date_of_testing: toNull(jobEntryTest.date_of_testing),
        material_description: jobEntryTest.material_description,
        material_id: data.materialDetails?.material_id ?? jobEntryTest.material_id,
        material_details_location: data.materialDetails?.material_details_location ?? jobEntryTest.material_details_location,
        sample_quantity: data.materialDetails?.sample_quantity ?? jobEntryTest.sample_quantity,
        testing_day: jobEntryTest.testing_day ?? data.materialDetails?.testing_day ?? null,
        date_of_casting: toNull(jobEntryTest.date_of_casting ?? data.materialDetails?.date_of_casting),
        additional_details_values: rawAddVals,
        test_method: jobEntryTest.test_method,
        grade: data.materialDetails?.grade ?? jobEntryTest.grade ?? jobEntryTest.additional_details_values?.Grade ?? jobEntryTest.additional_details_values?.grade ?? null,
      });

      if (materialInitials) {
        const supabase = await createClient() as any;
        const { data: updatedTest } = await supabase
          .from("job_entry_tests")
          .select("job_entry_id")
          .eq("id", testId)
          .single();

        if (updatedTest?.job_entry_id) {
          const { data: siblings } = await supabase
            .from("job_entry_tests")
            .select("id, additional_details_values")
            .eq("job_entry_id", updatedTest.job_entry_id)
            .neq("id", testId);

          if (siblings && siblings.length > 0) {
            for (const sib of siblings) {
              const sibVals = { ...(sib.additional_details_values || {}) };
              sibVals.test_initials = materialInitials;
              sibVals.material_initials = materialInitials;
              if (rawAddVals.sample_code_no) {
                sibVals.sample_code_no = rawAddVals.sample_code_no;
              }
              await supabase
                .from("job_entry_tests")
                .update({ additional_details_values: sibVals })
                .eq("id", sib.id);
            }
          }
        }
      }
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

export async function searchClientsAction(query: string, branchId?: string) {
  try {
    const clients = await ClientService.searchClients(query, branchId);
    return { success: true, data: clients };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getClientProjectsAction(clientId: string) {
  try {
    const data = await ClientService.getClientProjects(clientId);
    return { success: true, data };
  } catch (error) {
    console.error("getClientProjectsAction error:", error);
    return { success: false, error: "Failed to retrieve client projects" };
  }
}

export async function getNextUidAction() {
  try {
    const nextUid = await JobEntryService.getNextUid();
    return { success: true, nextUid };
  } catch (error) {
    console.error("getNextUidAction error:", error);
    return { success: false, error: "Failed to retrieve next UID" };
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
