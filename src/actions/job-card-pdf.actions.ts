"use server";

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageClientsAndJobs } from "@/config/roles";
import { JobCardPDF } from "@/components/pdf/JobCardPDF";

export async function downloadJobCardAction(jobEntryTestId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to view job entries");
    }

    const supabase = await createClient();

    const { data: testData, error: testError } = await supabase
      .from("job_entry_tests")
      .select(`
        *,
        test_master (*),
        job_entries (
          id,
          clients (*)
        )
      `)
      .eq("id", jobEntryTestId)
      .single();

    if (testError || !testData) {
      throw new Error("Job card not found");
    }

    const job = testData;
    // Handle potential array from select
    const jobEntries = Array.isArray(testData.job_entries) ? testData.job_entries[0] : testData.job_entries;
    const client = (jobEntries as any)?.clients;

    const buffer = await renderToBuffer(React.createElement(JobCardPDF, { data: { job, client } }) as any);
    const base64 = buffer.toString('base64');

    return { success: true, data: base64 };
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return { success: false, error: error.message };
  }
}
