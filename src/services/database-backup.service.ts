import { createPgClient } from "@/lib/db/pg";
import { createAdminClient } from "@/lib/supabase/admin";

export interface BackupPayload {
  version: string;
  app: string;
  exported_at: string;
  exported_by: {
    id: string;
    email: string;
    name?: string;
  };
  total_tables: number;
  total_records: number;
  table_counts: Record<string, number>;
  tables: Record<string, Record<string, any>[]>;
}

export interface RepopulateOptions {
  mode: "UPSERT" | "CLEAN_RESTORE";
  selectedTables?: string[];
  fileName?: string;
}

export interface BackupInspectionResult {
  isValid: boolean;
  error?: string;
  exportedAt?: string;
  exportedBy?: string;
  totalTables: number;
  totalRecords: number;
  tables: Array<{
    name: string;
    recordsCount: number;
    existsInDatabase: boolean;
  }>;
}

// Internal or transient tables that shouldn't typically be wiped/restored directly unless requested
const EXCLUDED_TABLES = new Set([
  "database_backups",
  "database_restore_logs",
]);

/**
 * Fetch list of all user tables in public schema
 */
export async function getPublicTableList(): Promise<string[]> {
  const client = createPgClient();
  await client.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `);
    return res.rows.map((r: any) => r.table_name);
  } finally {
    await client.end();
  }
}

/**
 * Generate a complete full database backup in JSON format
 */
export async function generateFullDatabaseBackup(user: {
  id: string;
  email: string;
  name?: string;
}): Promise<{
  payload: BackupPayload;
  fileName: string;
  fileSizeBytes: number;
  totalTables: number;
  totalRecords: number;
  summary: Record<string, number>;
}> {
  const client = createPgClient();
  await client.connect();

  try {
    const tables = await getPublicTableList();
    const backupTables: Record<string, any[]> = {};
    const tableCounts: Record<string, number> = {};
    let totalRecords = 0;

    for (const tableName of tables) {
      // Exclude logs of the backup system itself from being duplicated in snapshot
      if (EXCLUDED_TABLES.has(tableName)) continue;

      const res = await client.query(`SELECT * FROM public."${tableName}";`);
      backupTables[tableName] = res.rows;
      tableCounts[tableName] = res.rows.length;
      totalRecords += res.rows.length;
    }

    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:.]/g, "-");
    const fileName = `constrotrait_db_backup_${timestampStr}.json`;

    const payload: BackupPayload = {
      version: "1.0",
      app: "Constrotrait ERP",
      exported_at: now.toISOString(),
      exported_by: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      total_tables: Object.keys(backupTables).length,
      total_records: totalRecords,
      table_counts: tableCounts,
      tables: backupTables,
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const fileSizeBytes = Buffer.byteLength(jsonString, "utf8");

    // Record backup metadata in database_backups
    const supabase = createAdminClient();
    await supabase.from("database_backups").insert({
      file_name: fileName,
      file_size_bytes: fileSizeBytes,
      total_tables: payload.total_tables,
      total_records: totalRecords,
      created_by: user.id,
      creator_email: user.email,
      status: "COMPLETED",
      summary: tableCounts,
    });

    return {
      payload,
      fileName,
      fileSizeBytes,
      totalTables: payload.total_tables,
      totalRecords,
      summary: tableCounts,
    };
  } finally {
    await client.end();
  }
}

/**
 * Fetch backup history logs
 */
export async function getBackupHistory() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("database_backups")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching backup history:", error);
    return [];
  }
  return data || [];
}

/**
 * Fetch restore history logs
 */
export async function getRestoreHistory() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("database_restore_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching restore history:", error);
    return [];
  }
  return data || [];
}

/**
 * Inspect uploaded JSON backup file and return summary preview
 */
export async function inspectUploadedBackup(
  jsonContent: string
): Promise<BackupInspectionResult> {
  try {
    const parsed: BackupPayload = JSON.parse(jsonContent);

    if (!parsed || typeof parsed !== "object" || !parsed.tables) {
      return {
        isValid: false,
        error: "Invalid backup format: missing 'tables' payload.",
        totalTables: 0,
        totalRecords: 0,
        tables: [],
      };
    }

    const dbTables = new Set(await getPublicTableList());
    const tableKeys = Object.keys(parsed.tables);
    let totalRecords = 0;

    const tables = tableKeys.map((name) => {
      const rows = Array.isArray(parsed.tables[name]) ? parsed.tables[name] : [];
      const count = rows.length;
      totalRecords += count;
      return {
        name,
        recordsCount: count,
        existsInDatabase: dbTables.has(name),
      };
    });

    return {
      isValid: true,
      exportedAt: parsed.exported_at,
      exportedBy: parsed.exported_by?.email || "Unknown",
      totalTables: tables.length,
      totalRecords,
      tables,
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `JSON parse error: ${err.message}`,
      totalTables: 0,
      totalRecords: 0,
      tables: [],
    };
  }
}

/**
 * Repopulate database with provided backup payload
 */
export async function repopulateDatabase(
  payload: BackupPayload,
  options: RepopulateOptions,
  user: { id: string; email: string }
): Promise<{
  success: boolean;
  totalRestored: number;
  tableBreakdown: Record<string, number>;
  error?: string;
}> {
  const client = createPgClient();
  await client.connect();

  const restoredCounts: Record<string, number> = {};
  let totalRestored = 0;
  let status: "SUCCESS" | "FAILED" | "PARTIAL" = "SUCCESS";
  let errorMessage: string | undefined;

  try {
    await client.query("BEGIN;");

    // Temporarily disable foreign key constraints and triggers for clean, collision-free restoration
    await client.query("SET session_replication_role = 'replica';");

    // Fetch primary keys and column types across all public tables
    const pkRes = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public';
    `);

    const pkMap: Record<string, string[]> = {};
    pkRes.rows.forEach((r: any) => {
      if (!pkMap[r.table_name]) pkMap[r.table_name] = [];
      pkMap[r.table_name].push(r.column_name);
    });

    const colTypeRes = await client.query(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public';
    `);
    const colTypes: Record<string, Record<string, { dataType: string; udtName: string }>> = {};
    colTypeRes.rows.forEach((r: any) => {
      if (!colTypes[r.table_name]) colTypes[r.table_name] = {};
      colTypes[r.table_name][r.column_name] = {
        dataType: r.data_type,
        udtName: r.udt_name,
      };
    });

    const allowedTables = options.selectedTables && options.selectedTables.length > 0
      ? new Set(options.selectedTables)
      : new Set(Object.keys(payload.tables));

    for (const [tableName, rows] of Object.entries(payload.tables)) {
      if (!allowedTables.has(tableName)) continue;
      if (EXCLUDED_TABLES.has(tableName)) continue;
      if (!Array.isArray(rows) || rows.length === 0) {
        restoredCounts[tableName] = 0;
        continue;
      }

      // Check if table actually exists in database
      if (!colTypes[tableName]) {
        console.warn(`Skipping table '${tableName}': not found in database schema.`);
        continue;
      }

      // 1. If Clean & Restore mode is requested, empty table first
      if (options.mode === "CLEAN_RESTORE") {
        await client.query(`TRUNCATE TABLE public."${tableName}" CASCADE;`);
      }

      // 2. Insert/Upsert rows in chunks of 50
      const chunkSize = 50;
      let tableInserted = 0;
      const pks = pkMap[tableName] || [];

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        for (const row of chunk) {
          const rawCols = Object.keys(row);
          // Only include columns that actually exist in the DB table
          const validCols = rawCols.filter((c) => colTypes[tableName]?.[c]);
          if (validCols.length === 0) continue;

          const colList = validCols.map((c) => `"${c}"`).join(", ");
          const valPlaceholders = validCols.map((_, idx) => `$${idx + 1}`).join(", ");
          const values = validCols.map((c) => {
            const val = row[c];
            if (val === undefined || val === null) return null;
            const meta = colTypes[tableName][c];
            if (
              meta?.dataType === "json" ||
              meta?.dataType === "jsonb" ||
              (typeof val === "object" && !(val instanceof Date))
            ) {
              return JSON.stringify(val);
            }
            return val;
          });

          let sql = `INSERT INTO public."${tableName}" (${colList}) VALUES (${valPlaceholders})`;

          if (options.mode === "UPSERT" && pks.length > 0) {
            // Check that all PKs are present in row
            const hasAllPks = pks.every((pk) => validCols.includes(pk));
            if (hasAllPks) {
              const pkConflict = pks.map((p) => `"${p}"`).join(", ");
              const nonPkCols = validCols.filter((c) => !pks.includes(c));
              if (nonPkCols.length > 0) {
                const updateSet = nonPkCols
                  .map((c) => `"${c}" = EXCLUDED."${c}"`)
                  .join(", ");
                sql += ` ON CONFLICT (${pkConflict}) DO UPDATE SET ${updateSet}`;
              } else {
                sql += ` ON CONFLICT (${pkConflict}) DO NOTHING`;
              }
            }
          } else if (pks.length > 0) {
            const pkConflict = pks.map((p) => `"${p}"`).join(", ");
            sql += ` ON CONFLICT (${pkConflict}) DO NOTHING`;
          }

          await client.query(sql, values);
          tableInserted++;
        }
      }

      restoredCounts[tableName] = tableInserted;
      totalRestored += tableInserted;
    }

    // Restore replication role
    await client.query("SET session_replication_role = 'origin';");
    await client.query("COMMIT;");
  } catch (err: any) {
    status = "FAILED";
    errorMessage = err.message || "Failed to repopulate database";
    console.error("Database repopulate failed, rolling back:", err);
    try {
      await client.query("SET session_replication_role = 'origin';");
      await client.query("ROLLBACK;");
    } catch (rbErr) {
      console.error("Rollback error:", rbErr);
    }
  } finally {
    await client.end();
  }

  // Record operation log in database_restore_logs
  try {
    const supabase = createAdminClient();
    await supabase.from("database_restore_logs").insert({
      file_name: options.fileName || "manual_upload.json",
      restored_by: user.id,
      restorer_email: user.email,
      restore_mode: options.mode,
      tables_restored: restoredCounts,
      total_records_processed: totalRestored,
      status,
      error_message: errorMessage || null,
    });
  } catch (logErr) {
    console.error("Failed to insert database_restore_logs record:", logErr);
  }

  if (status === "FAILED") {
    return {
      success: false,
      totalRestored: 0,
      tableBreakdown: {},
      error: errorMessage,
    };
  }

  return {
    success: true,
    totalRestored,
    tableBreakdown: restoredCounts,
  };
}
