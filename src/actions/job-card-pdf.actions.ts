"use server";

import React from 'react';
import fs from 'fs';
import path from 'path';
import { renderToBuffer, DocumentProps } from '@react-pdf/renderer';
import { JobEntryService } from "@/services/job-entry.service";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageClientsAndJobs, isTestEngineer, isSuperAdmin, isBranchManager } from "@/config/roles";
import { JobCardPDF } from "@/components/pdf/JobCardPDF";

function getBase64Asset(filename: string): string {
  try {
    const fullPath = path.join(process.cwd(), 'public', filename);
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(fullPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      return `data:${mime};base64,${fs.readFileSync(fullPath).toString('base64')}`;
    }
  } catch (err) {
    console.error(`Failed to load asset ${filename}:`, err);
  }
  return `/${filename}`;
}

async function generateJobCardPdfBuffer(jobEntryTestId: string) {
  const { testData, jobsToPass, jobEntries, client } =
    await JobEntryService.getJobCardDetailsForPdf(jobEntryTestId);

  const logoUrl = getBase64Asset('CMTS LOGO.png');
  const preparedBySignUrl = getBase64Asset('Sanket_sir-removebg-preview.png');
  const approvedBySignUrl = getBase64Asset('MUKUND_GAIKWAD_SIGN-removebg-preview.png');

  const buffer = await renderToBuffer(
    React.createElement(JobCardPDF, {
      data: {
        jobs: jobsToPass,
        client,
        originalJob: testData,
        jobEntry: jobEntries,
        logoUrl,
        preparedBySignUrl,
        approvedBySignUrl
      }
    }) as unknown as React.ReactElement<DocumentProps>
  );
  return buffer.toString('base64');
}

/**
 * Fetch Job Card PDF for VIEWING.
 * Test Engineers, Lab Analysts, Quality/Technical Managers, and Admins can view job cards.
 */
export async function getJobCardPdfAction(jobEntryTestId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");

    const canView =
      canManageClientsAndJobs(user.roles) ||
      isTestEngineer(user.roles) ||
      user.roles.includes("LAB_ANALYST") ||
      user.roles.includes("QUALITY_MANAGER") ||
      user.roles.includes("TECHNICAL_MANAGER") ||
      isSuperAdmin(user.roles) ||
      isBranchManager(user.roles);

    if (!canView) {
      return { success: false, error: "Unauthorized: You do not have permission to view job cards" };
    }

    const base64 = await generateJobCardPdfBuffer(jobEntryTestId);
    return { success: true, data: base64 };
  } catch (error) {
    console.error("Error generating Job Card for viewing:", error);
    return { success: false, error: "Failed to generate job card PDF" };
  }
}

/**
 * Download Job Card PDF.
 * Test engineers are strictly forbidden from downloading job cards (view-only).
 */
export async function downloadJobCardAction(jobEntryTestId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");

    // Strictly disallow test engineers from downloading job cards
    if (isTestEngineer(user.roles) && !isSuperAdmin(user.roles) && !isBranchManager(user.roles)) {
      return { success: false, error: "Unauthorized: Test engineers are only permitted to view job cards, not download." };
    }

    if (!canManageClientsAndJobs(user.roles)) {
      return { success: false, error: "Unauthorized: You do not have permission to download job cards" };
    }

    const base64 = await generateJobCardPdfBuffer(jobEntryTestId);
    return { success: true, data: base64 };
  } catch (error) {
    console.error("Error downloading PDF:", error);
    return { success: false, error: "Failed to download job card PDF" };
  }
}

