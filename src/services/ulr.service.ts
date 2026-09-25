import { createClient } from "@/lib/supabase/server";

export const ULRService = {
  async generateForDate(date: string) {
    const supabase = await createClient();
    
    // @ts-ignore: type for generate_ulr_for_date might be missing until db types are regenerated
    const { error } = await supabase.rpc('generate_ulr_for_date', {
      p_date: date
    });

    if (error) {
      console.error("Failed to generate ULRs:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
};
