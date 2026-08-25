'use server';

import { z } from 'zod';
import { submitEOD, reviewEOD, updateEOD, getEODByEmployeeAndDate } from '@/services/eod.service';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUserWithRoles } from '@/services/auth.service';
import { canManageEOD, canReviewEOD } from '@/config/roles';

const eodSubmitSchema = z.object({
  employee_id: z.string().uuid(),
  report_date: z.string(),
  tasks_accomplished: z.string().min(1, "Tasks accomplished is required"),
  office_hours: z.number().min(0).max(12, "Office hours must be between 0 and 12"),
  location: z.enum(['Office', 'Field']),
  blockers: z.string().optional(),
  photo_url: z.string().optional(),
}).refine(data => data.location === 'Office' || (data.location === 'Field' && data.photo_url), {
  message: "Field photo is required when location is Field",
  path: ['photo_url']
});

export async function submitEODAction(formData: FormData) {
  try {
    const user = await getAuthenticatedUserWithRoles();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const rawData = {
      employee_id: formData.get('employee_id') as string,
      report_date: formData.get('report_date') as string,
      tasks_accomplished: formData.get('tasks_accomplished') as string,
      office_hours: Number(formData.get('office_hours')),
      location: formData.get('location') as "Office" | "Field",
      blockers: (formData.get('blockers') as string | null) ?? undefined,
      photo_url: (formData.get('photo_url') as string | null) ?? undefined,
    };

    const validatedData = eodSubmitSchema.parse(rawData);

    const isManager = canManageEOD(user.roles);
    const isOwnEOD = user.id === validatedData.employee_id;

    if (!isManager && !isOwnEOD) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await submitEOD(validatedData);

    if (result.success) {
      revalidatePath('/eod');
      return { success: true };
    }

    return { success: false, error: result.error };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return { success: false, error: "An unexpected error occurred" };
  }
}

const eodReviewSchema = z.object({
  eod_id: z.string().uuid(),
  action: z.enum(['Approve', 'Reject']),
  rejection_reason: z.string().optional()
}).refine(data => data.action === 'Approve' || (data.action === 'Reject' && data.rejection_reason && data.rejection_reason.trim().length > 0), {
  message: "Rejection reason is required",
  path: ['rejection_reason']
});

export async function reviewEODAction(formData: FormData) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canReviewEOD(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    const rawData = {
      eod_id: formData.get('eod_id') as string,
      action: formData.get('action') as 'Approve' | 'Reject',
      rejection_reason: (formData.get('rejection_reason') as string | null) ?? undefined,
    };

    const validatedData = eodReviewSchema.parse(rawData);

    const result = await reviewEOD(validatedData.eod_id, validatedData.action, validatedData.rejection_reason);

    if (result.success) {
      revalidatePath('/eod');
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function fetchEODAction(employeeId: string, reportDate: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || (!canManageEOD(user.roles) && user.id !== employeeId)) {
      return { success: false, error: "Unauthorized" };
    }
    return await getEODByEmployeeAndDate(employeeId, reportDate);
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateEODAction(formData: FormData) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canManageEOD(user.roles)) return { success: false, error: "Unauthorized" };
    const rawData = {
      employee_id: formData.get('employee_id') as string,
      report_date: formData.get('report_date') as string,
      tasks_accomplished: formData.get('tasks_accomplished') as string,
      office_hours: Number(formData.get('office_hours')),
      location: formData.get('location') as "Office" | "Field",
      blockers: (formData.get('blockers') as string | null) ?? undefined,
      photo_url: (formData.get('photo_url') as string | null) ?? undefined,
    };

    const validatedData = eodSubmitSchema.parse(rawData);

    const result = await updateEOD(validatedData);

    if (result.success) {
      revalidatePath('/eod');
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}
