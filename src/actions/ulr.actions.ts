'use server';

import { ULRService } from '@/services/ulr.service';
import { revalidatePath } from 'next/cache';

export async function generateULRsForDateAction(date: string) {
  const result = await ULRService.generateForDate(date);
  if (result.success) {
    revalidatePath('/job-cards');
    revalidatePath('/clients');
  }
  return result;
}
