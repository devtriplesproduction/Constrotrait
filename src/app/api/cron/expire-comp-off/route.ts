import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // Optional: Add simple secret verification
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const supabase = await createClient();
    
    // @ts-expect-error newly added rpc not in types yet
    const { data, error } = await (supabase.rpc as any)("expire_pending_comp_off_leaves");

    if (error) {
      console.error("Cron expiry error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      expired_leaves: data || [],
      message: `Successfully expired ${data?.length || 0} pending Comp-Off leaves.`
    });

  } catch (error) {
    console.error("Cron execution error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
