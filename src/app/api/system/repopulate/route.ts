import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canAccessSystemConsole } from "@/config/roles";
import {
  repopulateDatabase,
  BackupPayload,
  RepopulateOptions,
} from "@/services/database-backup.service";
import { revalidatePath } from "next/cache";

export const maxDuration = 120; // Support extended restoration runs

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in." },
        { status: 401 }
      );
    }

    const allRoles = user.allRoles || user.roles || [];
    if (!canAccessSystemConsole(allRoles)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Access restricted to Super Admin." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { jsonContent, options } = body;

    if (!jsonContent) {
      return NextResponse.json(
        { success: false, error: "Missing backup content." },
        { status: 400 }
      );
    }

    const payload: BackupPayload =
      typeof jsonContent === "string" ? JSON.parse(jsonContent) : jsonContent;

    if (!payload || !payload.tables) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid backup file: 'tables' section is missing.",
        },
        { status: 400 }
      );
    }

    const userMeta = {
      id: user.id,
      email: user.email || "system@constrotrait.com",
    };

    const repopulateOptions: RepopulateOptions = options || { mode: "UPSERT" };

    const result = await repopulateDatabase(payload, repopulateOptions, userMeta);
    revalidatePath("/", "layout");

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Database repopulate API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to repopulate database.",
      },
      { status: 500 }
    );
  }
}
