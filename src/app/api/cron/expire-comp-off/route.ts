import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

import { Database } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";

type CronSupabaseClient = SupabaseClient<Database> & {
  rpc: (
    fn: "expire_pending_comp_off_leaves",
    args?: Record<string, unknown>
  ) => Promise<{ error: { message: string, code?: string } | null; data: unknown }>;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabase = await createClient() as unknown as CronSupabaseClient;
    
    const { data, error } = await supabase.rpc("expire_pending_comp_off_leaves");

    if (error) {
      console.error("Cron expiry error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      expired_leaves: data || [],
      message: `Successfully expired ${Array.isArray(data) ? data.length : 0} pending Comp-Off leaves.`
    });

  } catch (error) {
    console.error("Cron execution error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
