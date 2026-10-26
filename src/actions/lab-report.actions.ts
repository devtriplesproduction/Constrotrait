"use server";

import React from "react";
import { renderToBuffer, DocumentProps } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { LabReportService } from "@/services/lab-report.service";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canIssueLabReport, isSuperAdmin, isBranchManager } from "@/config/roles";
import { NablTestReportPDF } from "@/components/pdf/NablTestReportPDF";
import { QcTestReportPDF } from "@/components/pdf/QcTestReportPDF";

export async function issueReportsForJobAction(jobEntryId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) {
      return { success: false, error: "Unauthorized access" };
    }
    if (!canIssueLabReport(user.roles)) {
      return { success: false, error: "Insufficient permissions to issue lab reports" };
    }

    const data = await LabReportService.issueForJob(jobEntryId);
    revalidatePath("/job-assignments");
    revalidatePath("/clients");
    return { success: true, data };
  } catch (error) {
    console.error("issueReportsForJobAction error:", error);
    return { success: false, error: "Failed to issue reports for this job" };
  }
}

export async function getReportsForJobAction(jobEntryId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) {
      return { success: false, error: "Unauthorized access" };
    }

    const data = await LabReportService.getReportsForJob(jobEntryId);
    return { success: true, data };
  } catch (error) {
    console.error("getReportsForJobAction error:", error);
    return { success: false, error: "Failed to retrieve lab reports" };
  }
}

export async function downloadLabReportAction(reportId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) {
      return { success: false, error: "Unauthorized access" };
    }

    const report = await LabReportService.getReport(reportId);
    if (!report) {
      return { success: false, error: "Report not found" };
    }

    const Template = report.report_class === "NABL" ? NablTestReportPDF : QcTestReportPDF;
    const buffer = await renderToBuffer(
      React.createElement(Template, { report: report as unknown as Parameters<typeof Template>[0]["report"] }) as unknown as React.ReactElement<DocumentProps>
    );
    return {
      success: true,
      data: buffer.toString("base64"),
      reportClass: report.report_class,
      reportNo: report.report_no
    };
  } catch (error) {
    console.error("downloadLabReportAction error:", error);
    return { success: false, error: "Failed to download lab report" };
  }
}
