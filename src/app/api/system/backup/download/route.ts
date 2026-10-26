import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canAccessSystemConsole } from "@/config/roles";
import { generateFullDatabaseBackup } from "@/services/database-backup.service";
import { buildBackupZipBuffer } from "@/lib/backup/backup-archive";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in." },
        { status: 401 }
      );
    }

    const allRoles = user.allRoles || user.roles || [];
    if (!canAccessSystemConsole(allRoles)) {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to Super Admin and Developer." },
        { status: 403 }
      );
    }

    const format = req.nextUrl.searchParams.get("format") || "zip";

    const userMeta = {
      id: user.id,
      email: user.email || "system@constrotrait.com",
      name: user.user_metadata?.first_name
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`.trim()
        : undefined,
    };

    const backup = await generateFullDatabaseBackup(userMeta);

    if (format === "json") {
      const jsonContent = JSON.stringify(backup.payload, null, 2);
      return new NextResponse(jsonContent, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${backup.jsonFileName}"`,
        },
      });
    }

    // Default: ZIP archive with module folders, JSON + CSV per table
    const { buffer, fileName } = await buildBackupZipBuffer(backup.payload);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error: any) {
    console.error("Backup download error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate backup download." },
      { status: 500 }
    );
  }
}
