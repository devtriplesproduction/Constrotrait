"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  ShieldCheck,
  Database,
  RefreshCw,
  Download,
  Upload,
  Search,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  AlertTriangle,
  History,
  FileJson,
  Layers,
  ArrowUpRight,
  Filter,
  FolderArchive,
  Folder,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/hooks/use-toast";
import {
  getLoginAuditLogsAction,
  generateDatabaseBackupAction,
  getBackupHistoryAction,
  inspectUploadedBackupAction,
  repopulateDatabaseAction,
  getRestoreHistoryAction,
} from "@/actions/system.actions";
import { getRoleColorBadge, getRoleDisplayName } from "@/config/roles";
import { cn } from "@/lib/utils/cn";
import {
  buildBackupZipArchive,
  extractBackupPayloadFromFile,
} from "@/lib/backup/backup-archive";

interface SystemConsoleManagerProps {
  currentUser: {
    id: string;
    email: string;
    name?: string;
    roles: string[];
    activeRole: string;
  };
}

export function SystemConsoleManager({ currentUser }: SystemConsoleManagerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"logins" | "backup" | "restore" | "history">("logins");

  // ==================== LOGIN TRACKER STATE ====================
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deviceFilter, setDeviceFilter] = useState("ALL");
  const [isLoadingLogs, startLoadingLogs] = useTransition();

  // ==================== BACKUP STATE ====================
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [backupProgress, setBackupProgress] = useState<{
    percent: number;
    status: string;
  } | null>(null);

  // ==================== RESTORE / REPOPULATE STATE ====================
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [inspection, setInspection] = useState<any | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [restoreMode, setRestoreMode] = useState<"UPSERT" | "CLEAN_RESTORE">("UPSERT");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableSearch, setTableSearch] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<any | null>(null);

  // ==================== RESTORE HISTORY STATE ====================
  const [restoreLogs, setRestoreLogs] = useState<any[]>([]);
  const [isLoadingRestoreLogs, setIsLoadingRestoreLogs] = useState(false);

  // ==================== COPIED IP FEEDBACK ====================
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // 1. Fetch Login Logs
  const fetchLoginLogs = () => {
    startLoadingLogs(async () => {
      const res = await getLoginAuditLogsAction({
        search,
        status: statusFilter,
        deviceType: deviceFilter,
        page,
        pageSize,
      });
      if (res.success && res.data) {
        setLogs(res.data.logs);
        setTotalLogs(res.data.total);
        if (res.data.stats) setStats(res.data.stats);
      } else {
        toast({
          variant: "error",
          title: "Failed to load login audit logs",
          description: res.error,
        });
      }
    });
  };

  useEffect(() => {
    fetchLoginLogs();
  }, [page, pageSize, statusFilter, deviceFilter]);

  // 2. Fetch Backups History
  const fetchBackupHistory = async () => {
    setIsLoadingBackups(true);
    const res = await getBackupHistoryAction();
    setIsLoadingBackups(false);
    if (res.success && res.data) {
      setBackups(res.data);
    }
  };

  useEffect(() => {
    if (activeTab === "backup" || activeTab === "history") {
      fetchBackupHistory();
    }
    if (activeTab === "history") {
      fetchRestoreHistory();
    }
  }, [activeTab]);

  // 3. Fetch Restore History
  const fetchRestoreHistory = async () => {
    setIsLoadingRestoreLogs(true);
    const res = await getRestoreHistoryAction();
    setIsLoadingRestoreLogs(false);
    if (res.success && res.data) {
      setRestoreLogs(res.data);
    }
  };

  // Handle Full Database Backup Generation & Instant Download
  const handleGenerateBackup = async (format: "zip" | "json" = "zip") => {
    try {
      setIsGeneratingBackup(true);
      setBackupProgress({
        percent: 25,
        status: "Contacting database snapshot engine...",
      });

      toast({
        title: "Starting Database Backup",
        description:
          format === "zip"
            ? "Packaging all tables into categorized module folders (ZIP)..."
            : "Exporting database tables into structured JSON...",
      });

      // Stream the backup file directly from server
      const res = await fetch(`/api/system/backup/download?format=${format}&t=${Date.now()}`);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || "Failed to generate backup.");
      }

      setBackupProgress({
        percent: 70,
        status: "Receiving compressed backup archive...",
      });

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let downloadFileName = format === "zip" ? "constrotrait_db_backup.zip" : "constrotrait_db_backup.json";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          downloadFileName = match[1];
        }
      }

      setBackupProgress({
        percent: 95,
        status: "Saving archive file to disk...",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      setBackupProgress({
        percent: 100,
        status: "Download completed successfully!",
      });

      toast({
        variant: "success",
        title: "Backup Downloaded!",
        description: `Successfully downloaded ${downloadFileName} (${(blob.size / (1024 * 1024)).toFixed(2)} MB).`,
      });

      setTimeout(() => {
        setIsGeneratingBackup(false);
        setBackupProgress(null);
        fetchBackupHistory();
      }, 1500);
    } catch (err: any) {
      setIsGeneratingBackup(false);
      setBackupProgress(null);
      toast({
        variant: "error",
        title: "Backup Failed",
        description: err.message || "An error occurred while generating backup.",
      });
    }
  };

  // Handle Uploaded File Selection & Inspection (.zip or .json)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isZip = lowerName.endsWith(".zip");
    const isJson = lowerName.endsWith(".json");

    if (!isZip && !isJson) {
      toast({
        variant: "error",
        title: "Invalid file format",
        description: "Please upload a valid .zip or .json database backup file.",
      });
      return;
    }

    setUploadedFile(file);
    setIsInspecting(true);
    setRestoreResult(null);

    try {
      const content = await extractBackupPayloadFromFile(file, file.name);
      setFileContent(content);

      const inspectionRes = await inspectUploadedBackupAction(content);
      setIsInspecting(false);

      if (inspectionRes.success && inspectionRes.data) {
        if (!inspectionRes.data.isValid) {
          toast({
            variant: "error",
            title: "Corrupt or Invalid Backup File",
            description: inspectionRes.data.error || "Backup structure is invalid.",
          });
          setInspection(null);
          return;
        }

        setInspection(inspectionRes.data);
        // Default to selecting all existing tables
        const validTableNames = inspectionRes.data.tables
          .filter((t: any) => t.existsInDatabase && t.recordsCount > 0)
          .map((t: any) => t.name);
        setSelectedTables(validTableNames);

        toast({
          variant: "success",
          title: "Backup Verified & Loaded",
          description: `Found ${inspectionRes.data.totalTables} tables and ${inspectionRes.data.totalRecords.toLocaleString()} records ready for repopulation.`,
        });
      } else {
        toast({
          variant: "error",
          title: "Inspection Failed",
          description: inspectionRes.error,
        });
        setInspection(null);
      }
    } catch (err: any) {
      setIsInspecting(false);
      toast({
        variant: "error",
        title: "Failed to read backup file",
        description: err.message || "Could not unpack backup contents.",
      });
      setInspection(null);
    }
  };

  // Handle Repopulate Execution
  const handleExecuteRepopulate = async () => {
    if (!fileContent || !inspection) {
      toast({
        variant: "error",
        title: "No file selected",
        description: "Please upload and verify a backup file first.",
      });
      return;
    }

    if (selectedTables.length === 0) {
      toast({
        variant: "error",
        title: "No tables selected",
        description: "Please select at least one table to repopulate.",
      });
      return;
    }

    if (restoreMode === "CLEAN_RESTORE" && confirmText.trim() !== "CONFIRM RESTORE") {
      toast({
        variant: "error",
        title: "Confirmation Required",
        description: 'Please type "CONFIRM RESTORE" to acknowledge table truncation.',
      });
      return;
    }

    try {
      setIsRestoring(true);
      toast({
        title: "Repopulating Database...",
        description: `Applying ${restoreMode} on ${selectedTables.length} tables in PostgreSQL. Please wait...`,
      });

      const res = await repopulateDatabaseAction(fileContent, {
        mode: restoreMode,
        selectedTables,
        fileName: uploadedFile?.name,
      });

      setIsRestoring(false);

      if (res.success) {
        const successRes = res as any;
        setRestoreResult(successRes);
        toast({
          variant: "success",
          title: "Database Repopulated Successfully!",
          description: `Total ${successRes.totalRestored} records restored across ${Object.keys(successRes.tableBreakdown || {}).length} tables.`,
        });
        fetchRestoreHistory();
        fetchLoginLogs();
      } else {
        toast({
          variant: "error",
          title: "Repopulation Failed",
          description: res.error || "An error occurred during database restoration.",
        });
      }
    } catch (err: any) {
      setIsRestoring(false);
      toast({
        variant: "error",
        title: "Unexpected Error",
        description: err.message,
      });
    }
  };

  // Copy IP to Clipboard
  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const filteredInspectionTables = (inspection?.tables || []).filter((t: any) =>
    t.name.toLowerCase().includes(tableSearch.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  System Console & Database Control
                </h1>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5">
                  Live DB Active
                </Badge>
              </div>
              <p className="text-sm text-slate-500">
                Track real-time logins, client IP & device metadata, generate full database backups, and repopulate data.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-400 font-medium">Logged in as</div>
            <div className="text-sm font-semibold text-slate-800">{currentUser.email}</div>
          </div>
          <Badge
            className={cn(
              "px-3 py-1 font-semibold text-xs border uppercase",
              currentUser.roles.includes("SUPER_ADMIN")
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            )}
          >
            {currentUser.roles.includes("SUPER_ADMIN") ? "SUPER ADMIN" : "DEVELOPER"}
          </Badge>
        </div>
      </div>

      {/* ==================== NAVIGATION TABS ==================== */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveTab("logins")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
            activeTab === "logins"
              ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Login & Device Tracking</span>
          {stats?.todayCount !== undefined && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-full font-bold">
              {stats.todayCount} today
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
            activeTab === "backup"
              ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Database Backup</span>
        </button>

        <button
          onClick={() => setActiveTab("restore")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
            activeTab === "restore"
              ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <Upload className="w-4 h-4 text-orange-600" />
          <span>Repopulate Database</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
            activeTab === "history"
              ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <History className="w-4 h-4 text-slate-600" />
          <span>Operations History</span>
        </button>
      </div>

      {/* ==================== TAB 1: LOGIN & DEVICE TRACKING ==================== */}
      {activeTab === "logins" && (
        <div className="space-y-6">
          {/* Analytics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Logins</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalLogins ?? totalLogs}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Recorded across all users</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Logins Today</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats?.todayCount ?? 0}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Active sessions today</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Success / Failed</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold text-emerald-600">{stats?.successCount ?? 0}</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-xl font-bold text-rose-600">{stats?.failedCount ?? 0}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Recent login attempts</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Devices Used</p>
              <div className="flex items-center justify-between text-xs text-slate-700">
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Desktop: {stats?.devicesBreakdown?.Desktop ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Mobile: {stats?.devicesBreakdown?.Mobile ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Tablet className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tablet: {stats?.devicesBreakdown?.Tablet ?? 0}</span>
                </div>
              </div>
              {stats?.topBrowsers && stats.topBrowsers.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
                  <span className="font-medium text-slate-600">Top Browsers:</span>
                  {stats.topBrowsers.map((b: any, idx: number) => (
                    <span key={b.name} className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                      {b.name} ({b.count})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by user email, name, IP address, OS, or browser..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLoginLogs()}
                className="pl-9 h-10 w-full"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success Only</option>
                <option value="FAILED">Failed Only</option>
              </select>

              <select
                value={deviceFilter}
                onChange={(e) => {
                  setDeviceFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Devices</option>
                <option value="Desktop">Desktop</option>
                <option value="Mobile">Mobile</option>
                <option value="Tablet">Tablet</option>
              </select>

              <Button
                variant="outline"
                onClick={fetchLoginLogs}
                disabled={isLoadingLogs}
                className="h-10 gap-2 cursor-pointer"
              >
                <RefreshCw className={cn("w-4 h-4", isLoadingLogs && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Logins Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4">User & Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Device & OS</th>
                    <th className="py-3.5 px-4">Browser</th>
                    <th className="py-3.5 px-4">IP Address</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoadingLogs && logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading login records...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No login audit logs found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const badgeStyle = getRoleColorBadge(log.role);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* User & Role */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">
                              {log.full_name || log.email.split("@")[0]}
                            </div>
                            <div className="text-xs text-slate-500">{log.email}</div>
                            {log.role && (
                              <div className="mt-1">
                                <span
                                  className={cn(
                                    "inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border",
                                    badgeStyle.bg,
                                    badgeStyle.text,
                                    badgeStyle.border
                                  )}
                                >
                                  {getRoleDisplayName(log.role)}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {log.status === "SUCCESS" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 w-fit">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>SUCCESS</span>
                              </Badge>
                            ) : (
                              <div>
                                <Badge className="bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 w-fit">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>FAILED</span>
                                </Badge>
                                {log.failure_reason && (
                                  <p className="text-[11px] text-rose-500 mt-1 max-w-[180px] truncate" title={log.failure_reason}>
                                    {log.failure_reason}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Device & OS */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {log.device_type === "Mobile" ? (
                                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : log.device_type === "Tablet" ? (
                                <Tablet className="w-4 h-4 text-amber-600 shrink-0" />
                              ) : (
                                <Monitor className="w-4 h-4 text-indigo-600 shrink-0" />
                              )}
                              <span className="font-medium text-slate-800">{log.device_type || "Desktop"}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {log.os || "Unknown OS"}
                            </div>
                          </td>

                          {/* Browser */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                              {log.browser || "Unknown Browser"}
                            </span>
                          </td>

                          {/* IP Address */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-fit">
                              <span>{log.ip_address || "127.0.0.1"}</span>
                              <button
                                onClick={() => handleCopyIp(log.ip_address || "127.0.0.1")}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer ml-1"
                                title="Copy IP"
                              >
                                {copiedIp === (log.ip_address || "127.0.0.1") ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Timestamp */}
                          <td className="py-3 px-4 text-xs text-slate-600">
                            <div className="font-medium text-slate-800">
                              {new Date(log.created_at).toLocaleDateString("en-IN", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                            <div className="text-slate-400 font-mono">
                              {new Date(log.created_at).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalLogs > 0 && (
              <div className="p-4 border-t border-slate-200">
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(totalLogs / pageSize)}
                  totalItems={totalLogs}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  pageSizeOptions={[15, 30, 50, 100]}
                  itemLabel="logins"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: DATABASE BACKUP ==================== */}
      {activeTab === "backup" && (
        <div className="space-y-6">
          {/* Main Action Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-8 rounded-2xl border border-indigo-800 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
              <Database className="w-80 h-80 text-white" />
            </div>

            <div className="max-w-3xl relative z-10 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Modular Folder Archive & Relational Snapshot</span>
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                Export Full Database Backup
              </h2>

              <p className="text-slate-300 text-sm leading-relaxed">
                Take an immediate, complete snapshot of all database tables. All tables are automatically sorted and organized into <strong className="text-white">ERP module folders</strong>. Each table includes both structured <code className="text-emerald-300">.json</code> data and <code className="text-amber-300">.csv</code> spreadsheet format (ready for Excel/Sheets), plus the full restore snapshot.
              </p>

              {/* Progress Indicator */}
              {isGeneratingBackup && backupProgress && (
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-emerald-300">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {backupProgress.status}
                    </span>
                    <span className="font-mono text-white">{backupProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${backupProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={() => handleGenerateBackup("zip")}
                  disabled={isGeneratingBackup}
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-6 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-3 cursor-pointer text-base transition-all transform active:scale-95"
                >
                  {isGeneratingBackup ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Packaging Database Tables...</span>
                    </>
                  ) : (
                    <>
                      <FolderArchive className="w-5 h-5" />
                      <span>Take Backup & Download ZIP (All Tables in Folders)</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleGenerateBackup("json")}
                  disabled={isGeneratingBackup}
                  variant="outline"
                  size="lg"
                  className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white font-medium px-5 py-6 rounded-xl cursor-pointer text-sm gap-2"
                >
                  <FileJson className="w-4 h-4 text-indigo-400" />
                  <span>Download Raw .json Only</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Folder Breakdown Preview Cards */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-indigo-600" />
                  <span>Folder Structure Included in Backup Archive</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tables are categorized into functional folders. Every folder contains individual <code className="text-indigo-600 font-mono text-[11px]">.json</code> and <code className="text-emerald-600 font-mono text-[11px]">.csv</code> files for each table.
                </p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                JSON + CSV (Excel Ready)
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                  <Folder className="w-4 h-4 shrink-0 fill-indigo-100" />
                  <span className="truncate">HR & Payroll</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Attendance, Leaves, Salary Slips, Holidays, Payroll Cycles, Loans
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                  <Folder className="w-4 h-4 shrink-0 fill-emerald-100" />
                  <span className="truncate">Accounting & Finance</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Invoices, Expenses, Inward Receipts, Quotations, Bank Ledgers
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                  <Folder className="w-4 h-4 shrink-0 fill-amber-100" />
                  <span className="truncate">Lab & Testing</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Job Entries, Lab Reports, Test Master, Test Results, ULR Queue
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 text-sky-600 font-bold text-xs">
                  <Folder className="w-4 h-4 shrink-0 fill-sky-100" />
                  <span className="truncate">Clients & Branches</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Clients Registry, Branches, Technician Teams, Team Members
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 text-purple-600 font-bold text-xs">
                  <Folder className="w-4 h-4 shrink-0 fill-purple-100" />
                  <span className="truncate">System & Security</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Profiles, Activity Logs, Login Audits, Sequence Numbers
                </p>
              </div>
            </div>
          </div>

          {/* Past Backups History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Database Backup History</h3>
                <p className="text-xs text-slate-500">Record of all snapshots generated by Super Admin and Developers</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBackupHistory}
                disabled={isLoadingBackups}
                className="gap-2 cursor-pointer"
              >
                <RefreshCw className={cn("w-4 h-4", isLoadingBackups && "animate-spin")} />
                <span>Refresh</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Backup File Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Tables</th>
                    <th className="py-3 px-4">Total Records</th>
                    <th className="py-3 px-4">Created By</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoadingBackups && backups.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading backup records...
                      </td>
                    </tr>
                  ) : backups.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No previous backups recorded. Click the button above to generate the first backup.
                      </td>
                    </tr>
                  ) : (
                    backups.map((b) => {
                      const isZipArchive = b.file_name?.toLowerCase().endsWith(".zip");
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono text-xs text-slate-900 font-semibold flex items-center gap-2">
                            {isZipArchive ? (
                              <FolderArchive className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <FileJson className="w-4 h-4 text-indigo-600 shrink-0" />
                            )}
                            <span>{b.file_name}</span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {isZipArchive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Folder className="w-3 h-3" />
                                <span>ZIP Folders</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                                <span>Single JSON</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                            {b.file_size_bytes > 1048576
                              ? `${(b.file_size_bytes / 1048576).toFixed(2)} MB`
                              : `${(b.file_size_bytes / 1024).toFixed(1)} KB`}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                            {b.total_tables} tables
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                            {b.total_records.toLocaleString()} rows
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {b.creator_email || "System"}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {new Date(b.created_at).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                              {b.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: REPOPULATE & RESTORE ==================== */}
      {activeTab === "restore" && (
        <div className="space-y-6">
          {/* File Upload Zone */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Upload Backup Archive or JSON File to Repopulate Database
              </h2>
              <p className="text-sm text-slate-500">
                Developers can upload a previously exported <code className="text-emerald-600 font-mono">.zip</code> archive or <code className="text-indigo-600 font-mono">.json</code> data file to restore or synchronize tables in the live database.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-8 text-center transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".json,.zip"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-800">
                    {uploadedFile ? uploadedFile.name : "Click to select or drag and drop your .zip backup archive or .json file"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Accepts Constrotrait database backup archives (.zip) or JSON dumps (Max 200MB)
                  </p>
                </div>
                {isInspecting && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Unpacking archive and analyzing tables and schema compatibility...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inspection & Repopulation Settings */}
          {inspection && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Backup Verified: Ready to Repopulate</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Exported at {new Date(inspection.exportedAt).toLocaleString("en-IN")} by {inspection.exportedBy}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
                    {inspection.totalTables} Tables Detected
                  </Badge>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {inspection.totalRecords.toLocaleString()} Records
                  </Badge>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-800">1. Select Repopulation Mode</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mode A: Upsert */}
                  <div
                    onClick={() => setRestoreMode("UPSERT")}
                    className={cn(
                      "p-5 rounded-xl border-2 transition-all cursor-pointer relative",
                      restoreMode === "UPSERT"
                        ? "border-emerald-600 bg-emerald-50/30"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Safe Upsert & Merge (Recommended)</span>
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Non-Destructive</Badge>
                      </div>
                      <input
                        type="radio"
                        checked={restoreMode === "UPSERT"}
                        onChange={() => setRestoreMode("UPSERT")}
                        className="w-4 h-4 text-emerald-600"
                      />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Updates existing rows matching Primary Key IDs and inserts any new records. Existing records not in the backup are preserved safely. Replication role handles constraint bypasses cleanly.
                    </p>
                  </div>

                  {/* Mode B: Clean Restore */}
                  <div
                    onClick={() => setRestoreMode("CLEAN_RESTORE")}
                    className={cn(
                      "p-5 rounded-xl border-2 transition-all cursor-pointer relative",
                      restoreMode === "CLEAN_RESTORE"
                        ? "border-rose-600 bg-rose-50/30"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Clean Wipe & Repopulate</span>
                        <Badge className="bg-rose-100 text-rose-800 text-[10px]">Destructive</Badge>
                      </div>
                      <input
                        type="radio"
                        checked={restoreMode === "CLEAN_RESTORE"}
                        onChange={() => setRestoreMode("CLEAN_RESTORE")}
                        className="w-4 h-4 text-rose-600"
                      />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Clears/truncates the selected tables first and inserts fresh data from the backup file inside a single rollback-safe transaction. Use when restoring a clean environment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Table Selection */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-sm font-bold text-slate-800">
                    2. Select Tables to Repopulate ({selectedTables.length} of {inspection.tables.length} selected)
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedTables(
                          inspection.tables.filter((t: any) => t.existsInDatabase).map((t: any) => t.name)
                        )
                      }
                      className="h-7 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Select All
                    </Button>
                    <span className="text-slate-300">|</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTables([])}
                      className="h-7 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Filter tables..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-8 h-8 text-xs w-full sm:w-64"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {filteredInspectionTables.map((table: any) => {
                    const isSelected = selectedTables.includes(table.name);
                    return (
                      <label
                        key={table.name}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all select-none",
                          isSelected
                            ? "bg-white border-indigo-400 shadow-2xs font-semibold text-slate-900"
                            : "bg-slate-100/60 border-slate-200 text-slate-500 hover:bg-white"
                        )}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTables((prev) => [...prev, table.name]);
                              } else {
                                setSelectedTables((prev) => prev.filter((n) => n !== table.name));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate">{table.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 px-1.5 py-0.5 bg-slate-200/60 rounded">
                          {table.recordsCount}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Confirmation for Destructive Mode */}
              {restoreMode === "CLEAN_RESTORE" && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>Warning: Destructive Table Truncation</span>
                  </div>
                  <p className="text-xs text-rose-600 leading-relaxed">
                    This mode will wipe existing records in the selected {selectedTables.length} tables before repopulating from the file. To confirm and proceed, type <span className="font-bold underline">CONFIRM RESTORE</span> below:
                  </p>
                  <Input
                    placeholder='Type "CONFIRM RESTORE" to unlock execution...'
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="max-w-md h-9 text-xs bg-white border-rose-300 focus:ring-rose-500"
                  />
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 flex items-center gap-3">
                <Button
                  onClick={handleExecuteRepopulate}
                  disabled={
                    isRestoring ||
                    selectedTables.length === 0 ||
                    (restoreMode === "CLEAN_RESTORE" && confirmText.trim() !== "CONFIRM RESTORE")
                  }
                  size="lg"
                  className={cn(
                    "font-bold px-8 py-5 rounded-xl shadow-md cursor-pointer flex items-center gap-2",
                    restoreMode === "CLEAN_RESTORE"
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  )}
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Repopulating Database...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Execute Repopulate ({selectedTables.length} Tables)</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadedFile(null);
                    setFileContent(null);
                    setInspection(null);
                    setRestoreResult(null);
                  }}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              </div>

              {/* Results Breakdown */}
              {restoreResult && (
                <div className="p-6 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3 mt-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <span>Database Repopulation Completed!</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    A total of <strong>{restoreResult.totalRestored.toLocaleString()} records</strong> were successfully restored across {Object.keys(restoreResult.tableBreakdown || {}).length} tables.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
                    {Object.entries(restoreResult.tableBreakdown || {}).map(([table, count]) => (
                      <div key={table} className="bg-white px-2.5 py-1.5 rounded-md border border-emerald-200 text-xs flex justify-between">
                        <span className="font-medium text-slate-800 truncate">{table}</span>
                        <span className="font-bold text-emerald-700">+{String(count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: OPERATIONS HISTORY ==================== */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Database Repopulate / Restore Log</h3>
                <p className="text-xs text-slate-500">History of data files restored into the database</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRestoreHistory}
                disabled={isLoadingRestoreLogs}
                className="gap-2 cursor-pointer"
              >
                <RefreshCw className={cn("w-4 h-4", isLoadingRestoreLogs && "animate-spin")} />
                <span>Refresh</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">File Name</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Restored By</th>
                    <th className="py-3 px-4">Records Processed</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoadingRestoreLogs && restoreLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading restore history...
                      </td>
                    </tr>
                  ) : restoreLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No database restore events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    restoreLogs.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-xs text-slate-900 font-semibold flex items-center gap-2">
                          <FileJson className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{r.file_name}</span>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">
                          <Badge
                            className={
                              r.restore_mode === "CLEAN_RESTORE"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }
                          >
                            {r.restore_mode}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {r.restorer_email || "Developer"}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                          {r.total_records_processed?.toLocaleString() || 0} rows
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {new Date(r.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              r.status === "SUCCESS"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
