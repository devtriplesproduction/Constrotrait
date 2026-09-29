"use server";

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { LabReportService } from "@/services/lab-report.service";
import { NablTestReportPDF } from "@/components/pdf/NablTestReportPDF";
import { QcTestReportPDF } from "@/components/pdf/QcTestReportPDF";

export async function issueReportsForJobAction(jobEntryId: string) {
  try {
    const data = await LabReportService.issueForJob(jobEntryId);
    revalidatePath("/job-assignments");
    revalidatePath("/clients");
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getReportsForJobAction(jobEntryId: string) {
  try {
    const data = await LabReportService.getReportsForJob(jobEntryId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function downloadLabReportAction(reportId: string) {
  try {
    const report = await LabReportService.getReport(reportId);
    if (!report) throw new Error("Report not found");

    const Template = report.report_class === "NABL" ? NablTestReportPDF : QcTestReportPDF;
    const buffer = await renderToBuffer(
      React.createElement(Template, { report }) as any
    );
    return { success: true, data: buffer.toString("base64"), reportClass: report.report_class, reportNo: report.report_no };
  } catch (error: any) {
    console.error("downloadLabReportAction", error);
    return { success: false, error: error.message };
  }
}
