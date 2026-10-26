import JSZip from "jszip";
import type { BackupPayload } from "@/services/database-backup.service";

/**
 * Mapping of known database tables to their respective ERP functional modules/folders.
 */
export const MODULE_FOLDERS: Record<
  string,
  { folder: string; description: string }
> = {
  // 1. HR & Payroll
  attendance: {
    folder: "HR & Payroll",
    description: "Daily attendance logs and clock-in records",
  },
  eod_reports: {
    folder: "HR & Payroll",
    description: "End of Day employee progress submissions",
  },
  leave_requests: {
    folder: "HR & Payroll",
    description: "Employee leave applications and approvals",
  },
  comp_off_ledger: {
    folder: "HR & Payroll",
    description: "Compensatory off balances and credit ledger",
  },
  holidays: {
    folder: "HR & Payroll",
    description: "Company calendar and gazetted holidays",
  },
  payroll_cycles: {
    folder: "HR & Payroll",
    description: "Monthly payroll calculation runs and lock status",
  },
  payroll_snapshots: {
    folder: "HR & Payroll",
    description: "Frozen payroll calculation records per employee",
  },
  salary_slips: {
    folder: "HR & Payroll",
    description: "Generated salary pay slips and earnings breakdown",
  },
  salary_hikes: {
    folder: "HR & Payroll",
    description: "Historical salary revisions and compensation increments",
  },
  employee_financial_ledger: {
    folder: "HR & Payroll",
    description: "Employee loans, advance disbursements, and repayments",
  },
  payroll_adjustment_applications: {
    folder: "HR & Payroll",
    description: "Payroll adjustments, deductions, and incentives",
  },
  employee_applications: {
    folder: "HR & Payroll",
    description: "Candidate onboarding and job applications",
  },
  branch_employee_sequences: {
    folder: "HR & Payroll",
    description: "Branch employee numbering sequence counters",
  },

  // 2. Accounting & Finance
  accounting_projects: {
    folder: "Accounting & Finance",
    description: "Financial project codes and cost allocations",
  },
  financial_accounts: {
    folder: "Accounting & Finance",
    description: "Bank accounts, petty cash, and financial ledgers",
  },
  expense_categories: {
    folder: "Accounting & Finance",
    description: "Accounting expense taxonomy and classification categories",
  },
  inward_receipts: {
    folder: "Accounting & Finance",
    description: "Inward customer payment receipts",
  },
  accounting_expenses: {
    folder: "Accounting & Finance",
    description: "Operational, project, and branch expense records",
  },
  expense_payment_entries: {
    folder: "Accounting & Finance",
    description: "Direct expense payment disbursement logs",
  },
  quotations: {
    folder: "Accounting & Finance",
    description: "Client cost estimates, proposals, and quotations",
  },
  quotation_templates: {
    folder: "Accounting & Finance",
    description: "Reusable quotation item and pricing templates",
  },
  invoices: {
    folder: "Accounting & Finance",
    description: "Client tax invoices, billing states, and totals",
  },
  invoice_payments: {
    folder: "Accounting & Finance",
    description: "Settlements, adjustments, and receipts against invoices",
  },
  bank_reconciliations: {
    folder: "Accounting & Finance",
    description: "Bank statement reconciliation transactions",
  },
  accounting_audit_log: {
    folder: "Accounting & Finance",
    description: "Audit trail for financial ledger modifications",
  },

  // 3. Lab Testing & Operations
  test_master: {
    folder: "Lab & Testing",
    description: "Standard laboratory test catalog, parameters, and pricing",
  },
  job_assignments: {
    folder: "Lab & Testing",
    description: "Technician sample testing task assignments",
  },
  job_entries: {
    folder: "Lab & Testing",
    description: "Sample inward registrations and job cards",
  },
  job_entry_tests: {
    folder: "Lab & Testing",
    description: "Specific tests associated with each inward job entry",
  },
  test_results: {
    folder: "Lab & Testing",
    description: "Recorded laboratory measurement values and test results",
  },
  lab_reports: {
    folder: "Lab & Testing",
    description: "Finalized and issued laboratory test reports",
  },
  lab_report_lines: {
    folder: "Lab & Testing",
    description: "Individual report matrix line items and observations",
  },
  lab_settings: {
    folder: "Lab & Testing",
    description: "Lab configuration, NABL accreditations, and prefixes",
  },
  lab_uid_counters: {
    folder: "Lab & Testing",
    description: "Sample unique identifier (UID) sequence tracking",
  },
  ulr_generation_queue: {
    folder: "Lab & Testing",
    description: "Pending queue for NABL Unique Lab Report (ULR) numbers",
  },
  ulr_yearly_counters: {
    folder: "Lab & Testing",
    description: "Yearly ULR sequential counters",
  },
  report_yearly_counters: {
    folder: "Lab & Testing",
    description: "Yearly report sequential numbering counters",
  },
  uid_yearly_counters: {
    folder: "Lab & Testing",
    description: "Yearly sample UID sequential numbering counters",
  },
  id_sequences: {
    folder: "Lab & Testing",
    description: "System alphanumeric identifier counters",
  },
  qr_documents: {
    folder: "Lab & Testing",
    description: "QR verification links and public verification records",
  },

  // 4. Clients & Branches
  clients: {
    folder: "Clients & Branches",
    description: "Client business registry, contact details, and GST numbers",
  },
  branches: {
    folder: "Clients & Branches",
    description: "Branch offices, lab locations, and facility addresses",
  },
  teams: {
    folder: "Clients & Branches",
    description: "Lab and field testing technician teams",
  },
  team_members: {
    folder: "Clients & Branches",
    description: "Team personnel assignments and roles",
  },

  // 5. System & Security
  profiles: {
    folder: "System & Security",
    description: "User profiles, credentials metadata, and employee roles",
  },
  notifications: {
    folder: "System & Security",
    description: "System notifications and user alert logs",
  },
  activity_logs: {
    folder: "System & Security",
    description: "System activity auditing and event logs",
  },
  login_audit_logs: {
    folder: "System & Security",
    description: "Security login attempts, IPs, and browser audits",
  },
  database_backups: {
    folder: "System & Security",
    description: "Database snapshot history and backup logs",
  },
  database_restore_logs: {
    folder: "System & Security",
    description: "Database restoration and repopulation audit logs",
  },
};

/**
 * Determine the destination folder name for any database table
 */
export function getFolderForTable(tableName: string): string {
  const normalized = tableName.toLowerCase();

  if (MODULE_FOLDERS[normalized]) {
    return MODULE_FOLDERS[normalized].folder;
  }

  // Heuristic matching for tables added in future migrations
  if (
    normalized.includes("payroll") ||
    normalized.includes("leave") ||
    normalized.includes("attendance") ||
    normalized.includes("employee") ||
    normalized.includes("salary") ||
    normalized.includes("holiday") ||
    normalized.includes("compoff") ||
    normalized.includes("eod")
  ) {
    return "HR & Payroll";
  }

  if (
    normalized.includes("accounting") ||
    normalized.includes("invoice") ||
    normalized.includes("expense") ||
    normalized.includes("payment") ||
    normalized.includes("receipt") ||
    normalized.includes("quotation") ||
    normalized.includes("bank") ||
    normalized.includes("ledger") ||
    normalized.includes("finance")
  ) {
    return "Accounting & Finance";
  }

  if (
    normalized.includes("test") ||
    normalized.includes("job") ||
    normalized.includes("lab") ||
    normalized.includes("ulr") ||
    normalized.includes("uid") ||
    normalized.includes("report") ||
    normalized.includes("qr") ||
    normalized.includes("sample")
  ) {
    return "Lab & Testing";
  }

  if (
    normalized.includes("client") ||
    normalized.includes("branch") ||
    normalized.includes("team") ||
    normalized.includes("customer") ||
    normalized.includes("vendor")
  ) {
    return "Clients & Branches";
  }

  if (
    normalized.includes("profile") ||
    normalized.includes("user") ||
    normalized.includes("role") ||
    normalized.includes("audit") ||
    normalized.includes("auth") ||
    normalized.includes("setting") ||
    normalized.includes("log") ||
    normalized.includes("token") ||
    normalized.includes("session")
  ) {
    return "System & Security";
  }

  return "Master & Other Data";
}

/**
 * Escape a single cell value for CSV formatting (RFC 4180 standard)
 */
function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) {
    return "";
  }

  if (val instanceof Date) {
    return `"${val.toISOString()}"`;
  }

  if (typeof val === "object") {
    // Stringify JSON objects or arrays and escape double quotes
    return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
  }

  const str = String(val);
  // If value contains comma, quotes, or newlines, enclose in quotes and escape internal quotes
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert an array of record objects into an Excel-compatible CSV string with UTF-8 BOM
 */
export function convertTableToCsv(
  tableName: string,
  rows: Record<string, any>[]
): string {
  // UTF-8 BOM to ensure Microsoft Excel on Windows renders accents, currency symbols (₹), and characters properly
  const UTF8_BOM = "\uFEFF";

  if (!rows || rows.length === 0) {
    return `${UTF8_BOM}# Table: ${tableName} (0 records)\r\n`;
  }

  // Aggregate all unique column keys across all rows
  const columnSet = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => columnSet.add(k));
  }
  const columns = Array.from(columnSet);

  const headerLine = columns.map(escapeCsvValue).join(",");
  const lines: string[] = [headerLine];

  for (const row of rows) {
    const rowValues = columns.map((col) => escapeCsvValue(row[col]));
    lines.push(rowValues.join(","));
  }

  return UTF8_BOM + lines.join("\r\n");
}

/**
 * Populate a JSZip instance with module folders, JSON & CSV files, root snapshot, and README.
 */
export function populateBackupZip(
  zip: JSZip,
  payload: BackupPayload,
  onProgress?: (percent: number, status: string) => void
): void {
  const tables = payload.tables || {};
  const tableNames = Object.keys(tables);
  const totalTables = tableNames.length;

  const folderSummary: Record<
    string,
    { tablesCount: number; recordsCount: number; tables: string[] }
  > = {};

  // 1. Process each table and place in module folder as JSON and CSV
  let processed = 0;
  for (const tableName of tableNames) {
    const rows = Array.isArray(tables[tableName]) ? tables[tableName] : [];
    const folderName = getFolderForTable(tableName);

    if (!folderSummary[folderName]) {
      folderSummary[folderName] = {
        tablesCount: 0,
        recordsCount: 0,
        tables: [],
      };
    }
    folderSummary[folderName].tablesCount += 1;
    folderSummary[folderName].recordsCount += rows.length;
    folderSummary[folderName].tables.push(tableName);

    const folder = zip.folder(folderName);
    if (folder) {
      // 1.1 JSON format for this table
      const jsonContent = JSON.stringify(rows, null, 2);
      folder.file(`${tableName}.json`, jsonContent);

      // 1.2 Excel/Spreadsheet CSV format for this table
      const csvContent = convertTableToCsv(tableName, rows);
      folder.file(`${tableName}.csv`, csvContent);
    }

    processed++;
    if (onProgress) {
      const pct = Math.round((processed / totalTables) * 75);
      onProgress(pct, `Packaging table ${tableName} (${processed}/${totalTables})...`);
    }
  }

  // 2. Add full database backup JSON at root of archive (for 1-click restore compatibility)
  const fullBackupJson = JSON.stringify(payload, null, 2);
  zip.file("full_database_backup.json", fullBackupJson);

  // 3. Add manifest and summary
  const manifest = {
    app: payload.app || "Constrotrait ERP",
    version: payload.version || "1.0",
    exported_at: payload.exported_at,
    exported_by: payload.exported_by,
    total_tables: payload.total_tables,
    total_records: payload.total_records,
    modules: folderSummary,
    table_counts: payload.table_counts,
  };
  zip.file("backup_manifest.json", JSON.stringify(manifest, null, 2));

  // 4. Add human-readable README.txt
  const dateFormatted = new Date(payload.exported_at).toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  const folderListText = Object.entries(folderSummary)
    .map(
      ([folder, info]) =>
        `  📂 ${folder.padEnd(25, " ")} : ${info.tablesCount} tables, ${info.recordsCount.toLocaleString()} records`
    )
    .join("\r\n");

  const readmeContent = `================================================================================
CONSTROTRAIT ERP - DATABASE BACKUP ARCHIVE
================================================================================

Export Date   : ${dateFormatted} (${payload.exported_at})
Exported By   : ${payload.exported_by?.name || "User"} <${payload.exported_by?.email}>
Total Tables  : ${payload.total_tables}
Total Records : ${payload.total_records.toLocaleString()}

--------------------------------------------------------------------------------
FOLDER STRUCTURE & MODULES:
--------------------------------------------------------------------------------
${folderListText}

--------------------------------------------------------------------------------
FORMATS INCLUDED IN EACH FOLDER:
--------------------------------------------------------------------------------
1. <table_name>.json
   - Clean, structured JSON array of table rows.
   - Ideal for developers, API ingestion, and database migrations.

2. <table_name>.csv
   - Standard RFC-4180 CSV spreadsheet format with UTF-8 BOM.
   - Double-click to open directly in Microsoft Excel, Google Sheets, or LibreOffice.
   - Accents, date-times, and currency symbols (₹) render cleanly.

--------------------------------------------------------------------------------
ROOT FILES:
--------------------------------------------------------------------------------
- full_database_backup.json : Complete monolithic snapshot for system restoration.
- backup_manifest.json     : Metadata index of modules, table names, and row counts.
- README.txt               : This summary documentation.

--------------------------------------------------------------------------------
HOW TO RESTORE / REPOPULATE:
--------------------------------------------------------------------------------
To restore your database from this backup:
1. Navigate to Constrotrait ERP -> System Console -> Repopulate Database.
2. Upload this .zip file directly (or upload full_database_backup.json).
3. Select Upsert or Clean Restore mode, choose your tables, and click Restore.

================================================================================
Generated automatically by Constrotrait ERP Snapshot Engine.
`;

  zip.file("README.txt", readmeContent);
}

/**
 * Generate a complete ZIP archive as a Node Buffer (for Server Route download).
 */
export async function buildBackupZipBuffer(
  payload: BackupPayload
): Promise<{ buffer: Buffer; fileName: string; sizeBytes: number }> {
  const zip = new JSZip();
  populateBackupZip(zip, payload);

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const timestampStr = new Date(payload.exported_at)
    .toISOString()
    .replace(/[:.]/g, "-");
  const fileName = `constrotrait_db_backup_${timestampStr}.zip`;

  return {
    buffer,
    fileName,
    sizeBytes: buffer.length,
  };
}

/**
 * Generate a complete ZIP archive organizing all tables into module folders with both JSON and CSV files.
 */
export async function buildBackupZipArchive(
  payload: BackupPayload,
  onProgress?: (percent: number, status: string) => void
): Promise<{ blob: Blob; fileName: string; sizeBytes: number }> {
  const zip = new JSZip();
  populateBackupZip(zip, payload, onProgress);

  if (onProgress) {
    onProgress(85, "Compressing archive files...");
  }

  // Generate final compressed ZIP blob with explicit application/zip mime type
  const blob = await zip.generateAsync(
    {
      type: "blob",
      mimeType: "application/zip",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        const pct = 85 + Math.round((metadata.percent / 100) * 15);
        onProgress(Math.min(pct, 99), `Compressing: ${Math.round(metadata.percent)}%`);
      }
    }
  );

  const timestampStr = new Date(payload.exported_at)
    .toISOString()
    .replace(/[:.]/g, "-");
  const fileName = `constrotrait_db_backup_${timestampStr}.zip`;

  return {
    blob,
    fileName,
    sizeBytes: blob.size,
  };
}

/**
 * Extract BackupPayload from an uploaded backup file (.zip or .json)
 */
export async function extractBackupPayloadFromFile(
  file: File | Blob,
  fileName: string
): Promise<string> {
  // If file is already a JSON file, read directly
  if (fileName.toLowerCase().endsWith(".json")) {
    return await file.text();
  }

  // If file is a ZIP archive, unpack it and look for full_database_backup.json or build it
  if (fileName.toLowerCase().endsWith(".zip")) {
    const zip = await JSZip.loadAsync(file);

    // 1. Check for standard full_database_backup.json
    const fullBackupFile =
      zip.file("full_database_backup.json") ||
      zip.file(/^constrotrait_db_backup_.*\.json$/i)[0];

    if (fullBackupFile) {
      return await fullBackupFile.async("text");
    }

    // 2. Fallback: reconstruct payload from all *.json files inside folders
    const jsonFiles = zip.file(/\.json$/i);
    const tables: Record<string, any[]> = {};
    let totalRecords = 0;

    for (const entry of jsonFiles) {
      if (
        entry.name === "backup_manifest.json" ||
        entry.name.endsWith("backup_manifest.json")
      ) {
        continue;
      }

      // Table name is the basename of the file without .json
      const parts = entry.name.split("/");
      const fileBasename = parts[parts.length - 1];
      const tableName = fileBasename.replace(/\.json$/i, "");

      if (!tableName) continue;

      try {
        const text = await entry.async("text");
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          tables[tableName] = parsed;
          totalRecords += parsed.length;
        } else if (parsed && typeof parsed === "object" && parsed.tables) {
          // If a full backup was placed inside a subdirectory
          return text;
        }
      } catch (e) {
        console.warn(`Could not parse JSON for ${entry.name}:`, e);
      }
    }

    if (Object.keys(tables).length > 0) {
      const reconstructed: BackupPayload = {
        version: "1.0",
        app: "Constrotrait ERP",
        exported_at: new Date().toISOString(),
        exported_by: {
          id: "reconstructed",
          email: "archive-upload",
        },
        total_tables: Object.keys(tables).length,
        total_records: totalRecords,
        table_counts: Object.fromEntries(
          Object.entries(tables).map(([k, v]) => [k, v.length])
        ),
        tables,
      };
      return JSON.stringify(reconstructed, null, 2);
    }

    throw new Error(
      "No valid database backup tables or 'full_database_backup.json' found inside this ZIP archive."
    );
  }

  throw new Error("Unsupported file format. Please upload a .zip or .json backup file.");
}
