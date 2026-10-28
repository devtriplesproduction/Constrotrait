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
      site_name: data.jobEntry.site_name,
      contact_person: data.jobEntry.contact_person,
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

export async function updateClientWizardAction(data: ClientWizardValues, targetId: string) {
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

    const supabase = await createClient() as any;

    // Resolve jobEntryId whether targetId is a job_entry_id or a job_entry_test_id
    let jobEntryId = targetId;
    const { data: jeDirect } = await supabase
      .from("job_entries")
      .select("id, uid, uid_label, created_at")
      .eq("id", targetId)
      .maybeSingle();

    let jobCreatedAt = jeDirect?.created_at;
    let jobUidLabel = jeDirect?.uid_label;

    if (!jeDirect) {
      const { data: testRow } = await supabase
        .from("job_entry_tests")
        .select("id, job_entry_id, uid_label, job_entries (id, created_at, uid_label)")
        .eq("id", targetId)
        .maybeSingle();
      if (testRow?.job_entry_id) {
        jobEntryId = testRow.job_entry_id;
        jobCreatedAt = testRow.job_entries?.created_at;
        jobUidLabel = testRow.uid_label || testRow.job_entries?.uid_label;
      }
    }

    if (jobEntryId) {
      await supabase.from("job_entries").update({
        site_name: toNull(data.jobEntry?.site_name),
        division: toNull(data.jobEntry?.division),
        agency: toNull(data.jobEntry?.agency_name),
        project_name: toNull(data.jobEntry?.project_name),
        dispatch_name: toNull(data.jobEntry?.dispatch_name),
        dispatch_address: toNull(data.jobEntry?.dispatch_address),
        contact_person: toNull(data.jobEntry?.contact_person),
        collected_by: toNull(data.jobEntry?.collected_by),
        invoice_no: toNull(data.jobEntry?.invoice_no),
        invoice_date: toNull(data.jobEntry?.invoice_date),
        letter_reference: toNull(data.jobEntry?.letter_reference),
        payment_status: toNull(data.jobEntry?.payment_status),
      }).eq("id", jobEntryId);
    }

    const { data: existingJobTests } = await supabase
      .from("job_entry_tests")
      .select("id, test_master_id, additional_details_values, uid_label")
      .eq("job_entry_id", jobEntryId);

    const materialInitials = ((data.materialDetails as any)?.test_initials || data.materialDetails?.material_initials)?.trim();
    const cleanInitials = materialInitials ? (materialInitials.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'GEN') : undefined;

    const valid5Part = /^CMTS\/(?:CON|ENV)\/([^\/]+)\/(\d{2}-\d{2})\/(\d+)(?:-([IVXLCDM\d]+))?$/i;
    let unifiedSampleCode: string | null = null;

    if (existingJobTests && existingJobTests.length > 0) {
      for (const t of existingJobTests) {
        const sc = (t.additional_details_values as any)?.sample_code_no;
        if (sc) {
          const firstCode = String(sc).split(/,\s*(?=CMTS\/)|,\s*/)[0]?.trim();
          if (firstCode && valid5Part.test(firstCode)) {
            unifiedSampleCode = sc;
            break;
          }
        }
      }
    }

    const sampleQuantityStr = data.materialDetails?.sample_quantity || data.jobEntryTests?.[0]?.sample_quantity || "1";
    const sampleQuantityMatch = sampleQuantityStr.match(/\d+/);
    let qty = sampleQuantityMatch ? parseInt(sampleQuantityMatch[0], 10) : 1;
    const matId = data.materialDetails?.material_id || data.jobEntryTests?.[0]?.material_id;
    if (qty === 1 && matId && typeof matId === 'string' && matId.includes(',')) {
      const matCount = matId.split(',').filter((s: string) => s.trim().length > 0).length;
      if (matCount > 1) qty = matCount;
    }
    if (isNaN(qty) || qty <= 0) qty = 1;

    if (unifiedSampleCode && cleanInitials) {
      const firstCode = String(unifiedSampleCode).split(/,\s*(?=CMTS\/)|,\s*/)[0]?.trim();
      const match = firstCode?.match(valid5Part);
      if (match) {
        const category = match[1].toUpperCase();
        const yearSegment = match[2];
        const sampleNo = match[3];
        const codes: string[] = [];
        for (let i = 1; i <= qty; i++) {
          codes.push(`CMTS/${category}/${cleanInitials}/${yearSegment}/${sampleNo}-${JobEntryService.toRoman(i)}`);
        }
        unifiedSampleCode = codes.join(', ');
      }
    }

    const submittedTestIds = new Set<string>();
    const testsToProcess = data.jobEntryTests || [];

    for (let i = 0; i < testsToProcess.length; i++) {
      const t = testsToProcess[i];
      const rawAddVals = { ...(t.additional_details_values || {}) };
      if (cleanInitials) {
        rawAddVals.material_initials = cleanInitials;
        rawAddVals.test_initials = cleanInitials;
      }
      if (unifiedSampleCode) {
        rawAddVals.sample_code_no = unifiedSampleCode;
      }

      let matchedExisting = (t as any).id
        ? existingJobTests?.find((e: any) => e.id === (t as any).id)
        : existingJobTests?.find((e: any) => e.test_master_id === t.test_master_id && !submittedTestIds.has(e.id));

      const testPayload = {
        test_master_id: toNull(t.test_master_id),
        date_of_receiving: toNull(data.materialDetails?.date_of_receiving ?? t.date_of_receiving),
        testing_age: t.testing_age || null,
        date_of_testing: toNull(t.date_of_testing),
        material_description: t.material_description || null,
        material_id: data.materialDetails?.material_id ?? t.material_id ?? null,
        material_details_location: data.materialDetails?.material_details_location ?? t.material_details_location ?? null,
        sample_quantity: data.materialDetails?.sample_quantity ?? t.sample_quantity ?? null,
        testing_day: t.testing_day ?? data.materialDetails?.testing_day ?? null,
        date_of_casting: toNull(t.date_of_casting ?? data.materialDetails?.date_of_casting),
        additional_details_values: rawAddVals,
        test_method: t.test_method || null,
        grade: data.materialDetails?.grade ?? t.grade ?? rawAddVals.Grade ?? rawAddVals.grade ?? null,
      };

      if (matchedExisting) {
        submittedTestIds.add(matchedExisting.id);
        await JobEntryService.updateJobEntryTest(matchedExisting.id, testPayload);
      } else {
        const { data: newTest } = await supabase.from("job_entry_tests").insert({
          ...testPayload,
          job_entry_id: jobEntryId,
          uid_label: jobUidLabel || existingJobTests?.[0]?.uid_label || null,
        }).select().single();
        if (newTest) {
          submittedTestIds.add(newTest.id);
        }
      }
    }

    // Delete tests that were unselected by the user
    if (existingJobTests && data.selectedTestIds && data.selectedTestIds.length > 0) {
      const testsToDelete = existingJobTests.filter((e: any) => !data.selectedTestIds.includes(e.test_master_id));
      for (const td of testsToDelete) {
        await supabase.from("job_assignments").delete().eq("job_entry_test_id", td.id);
        await supabase.from("job_entry_tests").delete().eq("id", td.id);
      }
    }

    if (jobEntryId) {
      await supabase.rpc("enqueue_ulr_for_job", { p_job_entry_id: jobEntryId });
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
