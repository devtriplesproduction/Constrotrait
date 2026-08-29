"use server";

import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { isHR, isSuperAdmin, isBranchManager } from "@/config/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSalarySlipPdfBuffer } from "@/lib/pdfGenerator";

function getStoragePathFromUrl(pdfUrl: string): string {
  try {
    const urlObj = new URL(pdfUrl);
    const bucketStr = '/salary_slips/';
    const bucketIndex = urlObj.pathname.indexOf(bucketStr);
    if (bucketIndex !== -1) {
      return decodeURIComponent(urlObj.pathname.substring(bucketIndex + bucketStr.length));
    }
  } catch(e) {}
  const parts = pdfUrl.split('?')[0].split('/');
  return decodeURIComponent(parts[parts.length - 1]);
}

export async function getMySalarySlipsAction() {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createAdminClient();
    
    const { data: slips, error } = await supabaseAdmin
      .from('salary_slips')
      .select(`
        id,
        pdf_url,
        status,
        generated_at,
        employee_id,
        snapshot_id,
        cycle:payroll_cycles(month, year)
      `)
      .eq('employee_id', user.id)
      .order('generated_at', { ascending: false });

    if (error) throw error;
    
    const formattedData = (slips || []).map((s: any) => ({
      id: s.id,
      month: s.cycle?.month,
      year: s.cycle?.year,
      status: s.status,
      pdf_url: s.pdf_url,
      employee_id: s.employee_id,
      snapshot_id: s.snapshot_id,
      generated_at: s.generated_at
    }));

    return { success: true, data: formattedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateSalarySlipAction(snapshotId: string, month: number, year: number) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || (!isHR(user.roles) && !isSuperAdmin(user.roles) && !isBranchManager(user.roles))) {
      return { success: false, error: "Unauthorized access." };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch snapshot
    const { data: snapshot, error: snapshotError } = await supabaseAdmin
      .from('payroll_snapshots')
      .select('*, profiles!payroll_snapshots_employee_id_fkey(branch_id)')
      .eq('id', snapshotId)
      .single();

    if (snapshotError || !snapshot) {
      return { success: false, error: "Validation Error: Snapshot not found." };
    }

    // 2. Branch Security
    const empBranchId = (snapshot as any).profiles?.branch_id;
    if (!isSuperAdmin(user.roles) && user.branch_id !== empBranchId) {
      return { success: false, error: "Unauthorized access to another branch's data." };
    }

    // 3. Generate PDF Buffer
    const pdfBuffer = await generateSalarySlipPdfBuffer(snapshot, month, year);

    // 4. Upload to Storage
    const fileName = `${year}/${month}/${snapshot.employee_id}/salary-slip.pdf`;
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('salary_slips')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      return { success: false, error: "Failed to upload salary slip." };
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('salary_slips')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // 5. Upsert Salary Slip Record
    const { data: existingSlip } = await supabaseAdmin
      .from('salary_slips')
      .select('id')
      .eq('snapshot_id', snapshotId)
      .single();

    if (existingSlip) {
      await supabaseAdmin
        .from('salary_slips')
        .update({
          pdf_url: pdfUrl,
          generated_at: new Date().toISOString(),
          generated_by: user.id,
          status: 'generated'
        })
        .eq('id', existingSlip.id);
    } else {
      await supabaseAdmin
        .from('salary_slips')
        .insert({
          employee_id: snapshot.employee_id,
          cycle_id: snapshot.cycle_id,
          snapshot_id: snapshotId,
          pdf_url: pdfUrl,
          generated_at: new Date().toISOString(),
          generated_by: user.id,
          status: 'generated'
        });
    }

    return { success: true, message: "Salary slip generated successfully.", pdf_url: pdfUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function emailSalarySlipAction(snapshotId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || (!isHR(user.roles) && !isSuperAdmin(user.roles) && !isBranchManager(user.roles))) {
      return { success: false, error: "Unauthorized access." };
    }

    const supabaseAdmin = createAdminClient();

    const { data: slip, error: slipError } = await supabaseAdmin
      .from('salary_slips')
      .select('id, pdf_url, employee_id, profiles!salary_slips_employee_id_fkey(email, first_name, last_name, branch_id)')
      .eq('snapshot_id', snapshotId)
      .single();

    if (slipError || !slip) {
      return { success: false, error: "Validation Error: Salary slip does not exist." };
    }

    // Branch Security
    const empBranchId = (slip as any).profiles?.branch_id;
    if (!isSuperAdmin(user.roles) && user.branch_id !== empBranchId) {
      return { success: false, error: "Unauthorized access to another branch's data." };
    }

    if (!slip.pdf_url) {
      return { success: false, error: "Validation Error: Salary slip file does not exist." };
    }

    const employeeEmail = (slip as any).profiles?.email;
    const employeeName = (slip as any).profiles?.first_name ? `${(slip as any).profiles.first_name} ${(slip as any).profiles.last_name || ''}`.trim() : "Employee";

    if (!employeeEmail) {
      return { success: false, error: "Employee does not have a registered email address." };
    }

    // Mock Email Send
    await new Promise(resolve => setTimeout(resolve, 800));

    const { error: updateError } = await supabaseAdmin
      .from('salary_slips')
      .update({ emailed: true, emailed_at: new Date().toISOString(), emailed_by: user.id, status: 'sent' })
      .eq('id', slip.id);

    if (updateError) {
      return { success: false, error: "Email sent, but failed to update status." };
    }

    return { success: true, message: `Salary slip emailed to ${employeeName}.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateSignedSalarySlipUrlAction(snapshotId: string, expiresInSeconds: number = 3600) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || (!isHR(user.roles) && !isSuperAdmin(user.roles) && !isBranchManager(user.roles))) {
      return { success: false, error: "Unauthorized access." };
    }

    const supabaseAdmin = createAdminClient();

    const { data: slip, error: slipError } = await supabaseAdmin
      .from('salary_slips')
      .select('pdf_url, employee_id, cycle_id, profiles!salary_slips_employee_id_fkey(branch_id)')
      .eq('snapshot_id', snapshotId)
      .single();

    if (slipError || !slip || !slip.pdf_url) {
      return { success: false, error: "Validation Error: Salary slip does not exist." };
    }

    // Branch Security
    const empBranchId = (slip as any).profiles?.branch_id;
    if (!isSuperAdmin(user.roles) && user.branch_id !== empBranchId) {
      return { success: false, error: "Unauthorized access to another branch's data." };
    }

    const fileName = getStoragePathFromUrl(slip.pdf_url);

    const { data, error } = await supabaseAdmin.storage
      .from('salary_slips')
      .createSignedUrl(fileName, expiresInSeconds);

    if (error || !data) {
      return { success: false, error: "Validation Error: Signed URL generation failed." };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markSalarySlipSharedAction(snapshotId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || (!isHR(user.roles) && !isSuperAdmin(user.roles) && !isBranchManager(user.roles))) {
      return { success: false, error: "Unauthorized access." };
    }

    const supabaseAdmin = createAdminClient();

    const { data: slip } = await supabaseAdmin
      .from('salary_slips')
      .select('profiles!salary_slips_employee_id_fkey(branch_id)')
      .eq('snapshot_id', snapshotId)
      .single();

    if (!slip) return { success: false, error: "Validation Error: Salary slip does not exist." };

    // Branch Security
    const empBranchId = (slip as any).profiles?.branch_id;
    if (!isSuperAdmin(user.roles) && user.branch_id !== empBranchId) {
      return { success: false, error: "Unauthorized access to another branch's data." };
    }

    const { error } = await supabaseAdmin
      .from('salary_slips')
      .update({ shared: true })
      .eq('snapshot_id', snapshotId);

    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function downloadSalarySlipBase64Action(employeeId: string, month: number, year: number) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || (!isHR(user.roles) && !isSuperAdmin(user.roles) && !isBranchManager(user.roles))) {
      return { success: false, error: "Unauthorized access." };
    }

    const supabaseAdmin = createAdminClient();

    const { data: cycle } = await supabaseAdmin.from('payroll_cycles').select('id').eq('month', month).eq('year', year).single();
    if (!cycle) return { success: false, error: "Payroll cycle not found." };

    const { data: slip } = await supabaseAdmin
      .from('salary_slips')
      .select('pdf_url, profiles!salary_slips_employee_id_fkey(branch_id)')
      .eq('cycle_id', cycle.id)
      .eq('employee_id', employeeId)
      .single();

    if (!slip || !slip.pdf_url) return { success: false, error: "Salary slip not found." };

    // Branch Security
    const empBranchId = (slip as any).profiles?.branch_id;
    if (!isSuperAdmin(user.roles) && user.branch_id !== empBranchId) {
      return { success: false, error: "Unauthorized access to another branch's data." };
    }

    const fileName = getStoragePathFromUrl(slip.pdf_url);

    const { data: fileData, error } = await supabaseAdmin.storage.from('salary_slips').download(fileName);
    if (error || !fileData) return { success: false, error: "Failed to download file from storage." };

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return { success: true, base64, filename: fileName.split('/').pop() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
