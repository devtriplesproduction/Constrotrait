import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "healthy";

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("branches").select("id").limit(1);
    if (error) {
      dbStatus = `degraded: ${error.message}`;
    }
  } catch (err) {
    dbStatus = `unreachable: ${(err as Error).message}`;
  }

  const responseTimeMs = Date.now() - startTime;
  const isHealthy = !dbStatus.startsWith("unreachable");

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "error",
      database: dbStatus,
      responseTimeMs,
      timestamp: new Date().toISOString(),
    },
    { status: isHealthy ? 200 : 503 }
  );
}
