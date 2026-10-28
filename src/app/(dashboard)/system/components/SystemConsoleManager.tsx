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
  MapPin,
  Sparkles,
  Server,
  Activity,
  HardDrive,
  Users,
  Receipt,
  FlaskConical,
  Building2,
  Shield,
  Clock,
  ChevronRight,
  CheckCheck,
  Lock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/Pagination";
import { Dropdown } from "@/components/ui/Dropdown";
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
  initialTab?: "logins" | "backup" | "restore" | "history";
}

export function SystemConsoleManager({ currentUser, initialTab = "backup" }: SystemConsoleManagerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"logins" | "backup" | "restore" | "history">(initialTab);

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
    if (activeTab === "logins") {
      fetchLoginLogs();
    }
  }, [activeTab, page, pageSize, statusFilter, deviceFilter]);

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
        percent: 20,
        status: "Connecting to database snapshot engine...",
      });

      toast({
        title: "Starting Database Backup",
        description:
          format === "zip"
            ? "Packaging all tables into categorized module folders (ZIP)..."
            : "Exporting database tables into structured JSON...",
      });

      const res = await fetch(`/api/system/backup/download?format=${format}&t=${Date.now()}`);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || "Failed to generate backup.");
      }

      setBackupProgress({
        percent: 68,
        status: "Generating compressed archive stream...",
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
        percent: 92,
        status: "Saving archive to local disk...",
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
        title: "Backup Complete!",
        description: `Downloaded ${downloadFileName} (${(blob.size / (1024 * 1024)).toFixed(2)} MB).`,
      });

      setTimeout(() => {
        setIsGeneratingBackup(false);
        setBackupProgress(null);
        fetchBackupHistory();
      }, 1200);
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

  // Device Breakdown Stats
  const desktopCount = stats?.devicesBreakdown?.Desktop ?? 0;
  const mobileCount = stats?.devicesBreakdown?.Mobile ?? 0;
  const tabletCount = stats?.devicesBreakdown?.Tablet ?? 0;
  const deviceTotal = (desktopCount + mobileCount + tabletCount) || 1;
  const desktopPct = Math.round((desktopCount / deviceTotal) * 100);
  const mobilePct = Math.round((mobileCount / deviceTotal) * 100);
  const tabletPct = Math.max(0, 100 - desktopPct - mobilePct);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="relative overflow-hidden bg-white/95 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs transition-all">
        {/* Subtle decorative radiant mesh background with brand orange warmth */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-amber-500/8 via-orange-500/8 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            {/* Glowing Icon Badge in ConstroTrait Orange */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-orange-500/30 blur-lg rounded-2xl" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 border border-white/25">
                <Database className="w-6 h-6 drop-shadow-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  System Console & Database Control
                </h1>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>Live DB Active</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
                Manage database backups, login audit trails, and system telemetry.
              </p>
            </div>
          </div>

          {/* User Profile Badge in Brand Orange */}
          <div className="flex items-center gap-3.5 bg-slate-50/90 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs self-start lg:self-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-sm shadow-orange-500/20">
              {currentUser.name
                ? currentUser.name.slice(0, 2).toUpperCase()
                : currentUser.email.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left pr-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Logged In As</div>
              <div className="text-xs font-bold text-slate-800 truncate max-w-[190px] sm:max-w-[240px]" title={currentUser.email}>
                {currentUser.email}
              </div>
            </div>
            <Badge
              className={cn(
                "px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider border shadow-2xs shrink-0",
                currentUser.roles.includes("SUPER_ADMIN")
                  ? "bg-orange-50 text-orange-700 border-orange-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}
            >
              {currentUser.roles.includes("SUPER_ADMIN") ? "SUPER ADMIN" : "DEVELOPER"}
            </Badge>
          </div>
        </div>
      </div>

      {/* ==================== NAVIGATION TABS ==================== */}
      <div className="flex items-center p-1.5 bg-slate-100/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 overflow-x-auto gap-1.5 shadow-inner">
        <button
          onClick={() => setActiveTab("logins")}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap",
            activeTab === "logins"
              ? "bg-white text-orange-600 shadow-sm border border-orange-200/80 ring-1 ring-orange-500/10 font-bold"
              : "text-slate-600 hover:text-orange-600 hover:bg-white/60"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            activeTab === "logins" ? "bg-orange-50 text-orange-600" : "text-slate-500"
          )}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span>Login & Device Tracking</span>
          {stats?.todayCount !== undefined && (
            <span className={cn(
              "ml-1 px-2 py-0.5 text-xs rounded-full font-bold transition-colors",
              activeTab === "logins"
                ? "bg-orange-100 text-orange-700"
                : "bg-slate-200/70 text-slate-600"
            )}>
              {stats.todayCount} today
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap",
            activeTab === "backup"
              ? "bg-white text-orange-600 shadow-sm border border-orange-200/80 ring-1 ring-orange-500/10 font-bold"
              : "text-slate-600 hover:text-orange-600 hover:bg-white/60"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            activeTab === "backup" ? "bg-orange-50 text-orange-600" : "text-slate-500"
          )}>
            <Download className="w-4 h-4" />
          </div>
          <span>Database Backup</span>
        </button>

        <button
          onClick={() => setActiveTab("restore")}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap",
            activeTab === "restore"
              ? "bg-white text-orange-600 shadow-sm border border-orange-200/80 ring-1 ring-orange-500/10 font-bold"
              : "text-slate-600 hover:text-orange-600 hover:bg-white/60"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            activeTab === "restore" ? "bg-orange-50 text-orange-600" : "text-slate-500"
          )}>
            <Upload className="w-4 h-4" />
          </div>
          <span>Repopulate Database</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap",
            activeTab === "history"
              ? "bg-white text-orange-600 shadow-sm border border-orange-200/80 ring-1 ring-orange-500/10 font-bold"
              : "text-slate-600 hover:text-orange-600 hover:bg-white/60"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            activeTab === "history" ? "bg-orange-50 text-orange-600" : "text-slate-500"
          )}>
            <History className="w-4 h-4" />
          </div>
          <span>Operations History</span>
        </button>
      </div>

      {/* ==================== TAB 2: DATABASE BACKUP (HERO BANNER) ==================== */}
      {activeTab === "backup" && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Main Hero Card in Light Theme with ConstroTrait Brand Accents */}
          <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 shadow-sm p-7 sm:p-9 text-slate-900">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />

            {/* Glowing ambient radial orbs in Brand Orange & Amber */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-orange-400/10 to-amber-300/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-tr from-orange-500/5 to-amber-400/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Copy & Actions */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                  </span>
                  <span>Production Snapshot Engine • Relational & Modular Archive</span>
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    Export Full Database Backup
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
                    Take an immediate, complete snapshot of all database tables. All tables are automatically organized into{" "}
                    <strong className="text-slate-900 font-bold">ERP module folders</strong>. Each table includes both structured{" "}
                    <span className="inline-block px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-mono text-xs font-semibold border border-orange-200">
                      .json
                    </span>{" "}
                    data and{" "}
                    <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-mono text-xs font-semibold border border-amber-200">
                      .csv
                    </span>{" "}
                    spreadsheet format (ready for Excel/Sheets), plus the full restore snapshot.
                  </p>
                </div>

                {/* Feature Tags Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 font-medium shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Instant Streaming</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 font-medium shadow-2xs">
                    <FolderArchive className="w-3.5 h-3.5 text-orange-600" />
                    <span>5 Module Folders</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 font-medium shadow-2xs">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel Ready (.csv)</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 font-medium shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>ACID Consistent</span>
                  </span>
                </div>

                {/* Progress Indicator */}
                {isGeneratingBackup && backupProgress && (
                  <div className="bg-orange-50/80 p-4 rounded-2xl border border-orange-200 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-2 text-orange-700">
                        <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
                        {backupProgress.status}
                      </span>
                      <span className="font-mono text-slate-800 text-sm">{backupProgress.percent}%</span>
                    </div>
                    <div className="w-full bg-orange-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-orange-200">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                        style={{ width: `${backupProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Button
                    onClick={() => handleGenerateBackup("zip")}
                    disabled={isGeneratingBackup}
                    variant="custom"
                    className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-sm sm:text-base px-6 py-3.5 h-auto rounded-2xl shadow-md shadow-orange-500/25 border border-orange-400/30 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3 disabled:opacity-60"
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
                    variant="custom"
                    className="bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm px-5 py-3.5 h-auto rounded-2xl border border-slate-200 hover:border-orange-300 shadow-2xs cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 disabled:opacity-60"
                  >
                    <FileJson className="w-4 h-4 text-orange-500" />
                    <span>Download Raw .json Only</span>
                  </Button>
                </div>
              </div>

              {/* Right Column: Live Architectural Telemetry Light Card */}
              <div className="lg:col-span-5 xl:col-span-4">
                <div className="bg-slate-50/90 rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-4 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Server className="w-4 h-4 text-orange-600" />
                      <span>PostgreSQL Core Engine</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      READY
                    </span>
                  </div>

                  {/* Stylized Visual Database Stack */}
                  <div className="space-y-2 py-1">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-700 font-semibold">
                        <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                        <span>Schema & Relations</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">All Tables</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-orange-200/80 shadow-2xs flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-orange-700 font-semibold">
                        <FolderArchive className="w-3.5 h-3.5 text-orange-600" />
                        <span>Modular Packaging</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded">5 ERP Folders</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export Payload</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">.json + .csv</span>
                    </div>
                  </div>

                  {/* Engine Details */}
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-slate-400 font-medium">Compression</div>
                      <div className="font-bold text-slate-800 mt-0.5">ZIP Archive</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-slate-400 font-medium">Integrity</div>
                      <div className="font-bold text-emerald-600 mt-0.5">FK & Types Safe</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== FOLDER BREAKDOWN CARDS ==================== */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <FolderArchive className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    Modular Folder Architecture in Backup Archive
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Every downloaded ZIP organizes tables into dedicated ERP module folders. Each table contains both structured <code className="text-indigo-600 font-mono text-[11px]">.json</code> and Excel-ready <code className="text-emerald-600 font-mono text-[11px]">.csv</code> spreadsheets.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200/80 text-xs font-bold px-3 py-1">
                  5 Modules
                </Badge>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 text-xs font-bold px-3 py-1">
                  JSON + CSV Included
                </Badge>
              </div>
            </div>

            {/* The 5 Themed Module Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
              {/* Module 1: HR & Payroll */}
              <div className="group relative rounded-2xl border border-rose-200/80 bg-gradient-to-b from-rose-50/40 via-white to-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-rose-500/10 hover:border-rose-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-rose-100/80 text-rose-700 border border-rose-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                      HR & Payroll
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 mb-1.5">
                    HR & Payroll Module
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Attendance records, leaves, salary slips, company holidays, payroll cycles, and staff advances.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>attendance, salary...</span>
                  <span className="font-bold text-rose-600">.json + .csv</span>
                </div>
              </div>

              {/* Module 2: Accounting & Finance */}
              <div className="group relative rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/40 via-white to-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100/80 text-emerald-700 border border-emerald-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Finance
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 mb-1.5">
                    Accounting & Finance
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Client invoices, ledger expenses, inward payments, quotations, and banking transactions.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>invoices, expenses...</span>
                  <span className="font-bold text-emerald-600">.json + .csv</span>
                </div>
              </div>

              {/* Module 3: Lab & Testing */}
              <div className="group relative rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/10 hover:border-amber-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-700 border border-amber-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                      <FlaskConical className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                      Lab Core
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 mb-1.5">
                    Lab & Material Testing
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Job entries, laboratory test reports, parameter master, test readings, and official ULR queues.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>job_cards, reports...</span>
                  <span className="font-bold text-amber-600">.json + .csv</span>
                </div>
              </div>

              {/* Module 4: Clients & Branches */}
              <div className="group relative rounded-2xl border border-sky-200/80 bg-gradient-to-b from-sky-50/40 via-white to-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-500/10 hover:border-sky-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-sky-100/80 text-sky-700 border border-sky-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                      Branches
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 mb-1.5">
                    Clients & Operations
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Client directory, company branches, technician field teams, and operational assignments.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-sky-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>clients, branches...</span>
                  <span className="font-bold text-sky-600">.json + .csv</span>
                </div>
              </div>

              {/* Module 5: System & Security */}
              <div className="group relative rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/40 via-white to-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-indigo-100/80 text-indigo-700 border border-indigo-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                      <Shield className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Security
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 mb-1.5">
                    System & Security
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    User profiles, login audits, sequence counters, system preferences, and security logs.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>profiles, audits...</span>
                  <span className="font-bold text-indigo-600">.json + .csv</span>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== BACKUP HISTORY TABLE ==================== */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                    <History className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    Database Backup History
                  </h3>
                  <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-mono text-xs">
                    {backups.length} snapshots
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Chronological record of all database snapshots generated by Super Admin and Developers.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchBackupHistory}
                disabled={isLoadingBackups}
                className="gap-2 cursor-pointer rounded-xl h-9 hover:bg-orange-50 hover:text-orange-600 font-semibold text-slate-700 border-slate-200"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoadingBackups && "animate-spin text-orange-600")} />
                <span>Refresh Logs</span>
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200/80 overflow-hidden">
              <table className="w-full table-fixed text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-[36%]">Backup Snapshot & Type</th>
                    <th className="py-3.5 px-4 w-[18%]">Tables & Records</th>
                    <th className="py-3.5 px-4 w-[20%]">Created By</th>
                    <th className="py-3.5 px-4 w-[14%]">Timestamp</th>
                    <th className="py-3.5 px-4 w-[12%]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoadingBackups && backups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                        <span>Loading backup records...</span>
                      </td>
                    </tr>
                  ) : backups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <FolderArchive className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No previous backups recorded</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "Take Backup & Download ZIP" above to generate the first complete database snapshot.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    backups.map((b) => {
                      const isZipArchive = b.file_name?.toLowerCase().endsWith(".zip");
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Backup Snapshot & Type */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "p-2 rounded-xl shrink-0 border shadow-2xs",
                                  isZipArchive
                                    ? "bg-orange-50 text-orange-600 border-orange-200"
                                    : "bg-amber-50 text-amber-600 border-amber-200"
                                )}
                              >
                                {isZipArchive ? (
                                  <FolderArchive className="w-4 h-4" />
                                ) : (
                                  <FileJson className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-mono text-xs font-bold text-slate-900 truncate" title={b.file_name}>
                                  {b.file_name}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border",
                                      isZipArchive
                                        ? "bg-orange-50 text-orange-700 border-orange-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                    )}
                                  >
                                    {isZipArchive ? "ZIP Folders" : "JSON Dump"}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-mono font-medium">
                                    {b.file_size_bytes > 1048576
                                      ? `${(b.file_size_bytes / 1048576).toFixed(2)} MB`
                                      : `${(b.file_size_bytes / 1024).toFixed(1)} KB`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Tables & Records */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span>{b.total_tables} Tables</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {b.total_records.toLocaleString()} rows
                            </div>
                          </td>

                          {/* Created By */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-700 border border-orange-100 font-bold text-[11px] flex items-center justify-center shrink-0">
                                {(b.creator_email || "SY").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-800 truncate" title={b.creator_email || "System"}>
                                  {b.creator_email ? b.creator_email.split("@")[0] : "System"}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate" title={b.creator_email || "System"}>
                                  {b.creator_email || "Automated"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Timestamp */}
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            <div className="font-semibold text-slate-800">
                              {new Date(b.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-slate-400 text-[11px] font-mono">
                              {new Date(b.created_at).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold text-[11px] flex items-center gap-1.5 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{b.status}</span>
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

      {/* ==================== TAB 1: LOGIN & DEVICE TRACKING ==================== */}
      {activeTab === "logins" && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Analytics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Logins */}
            <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Logins</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1.5 tracking-tight">
                  {stats?.totalLogins ?? totalLogs}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-orange-500" />
                  <span>Recorded across all users</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/25">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Logins Today */}
            <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logins Today</p>
                <h3 className="text-3xl font-black text-emerald-600 mt-1.5 tracking-tight">
                  {stats?.todayCount ?? 0}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active sessions recorded</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Success / Failed Ratio */}
            <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Success / Failed</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-2xl font-black text-emerald-600">{stats?.successCount ?? 0}</span>
                  <span className="text-slate-300 font-bold">/</span>
                  <span className="text-2xl font-black text-rose-600">{stats?.failedCount ?? 0}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Authentication attempts</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Devices Used & Distribution */}
            <div className="relative overflow-hidden bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Device Split</p>
                  <span className="text-[11px] font-mono text-slate-500">
                    {desktopCount + mobileCount + tabletCount} devices
                  </span>
                </div>

                {/* Split Visual Meter */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex gap-0.5">
                  <div style={{ width: `${desktopPct}%` }} className="bg-orange-500 h-full transition-all" title={`Desktop: ${desktopPct}%`} />
                  <div style={{ width: `${mobilePct}%` }} className="bg-emerald-500 h-full transition-all" title={`Mobile: ${mobilePct}%`} />
                  <div style={{ width: `${tabletPct}%` }} className="bg-amber-500 h-full transition-all" title={`Tablet: ${tabletPct}%`} />
                </div>

                <div className="grid grid-cols-3 gap-1 pt-3 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Monitor className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>D: {desktopCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>M: {mobileCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Tablet className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>T: {tabletCount}</span>
                  </div>
                </div>
              </div>

              {stats?.topBrowsers && stats.topBrowsers.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
                  <span className="font-semibold text-slate-600">Top:</span>
                  {stats.topBrowsers.slice(0, 2).map((b: any) => (
                    <span key={b.name} className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                      {b.name} ({b.count})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by user email, name, IP address, OS, or browser..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLoginLogs()}
                className="pl-10 h-10 w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
              <div className="w-full sm:w-40 shrink-0">
                <Dropdown
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                  placeholder="All Statuses"
                  buttonClassName="bg-white border-slate-200 shadow-2xs rounded-xl h-10 font-medium text-slate-700 hover:border-slate-300"
                  options={[
                    { value: "ALL", label: "All Statuses" },
                    { value: "SUCCESS", label: "Success Only" },
                    { value: "FAILED", label: "Failed Only" },
                  ]}
                />
              </div>

              <div className="w-full sm:w-36 shrink-0">
                <Dropdown
                  value={deviceFilter}
                  onChange={(val) => {
                    setDeviceFilter(val);
                    setPage(1);
                  }}
                  placeholder="All Devices"
                  buttonClassName="bg-white border-slate-200 shadow-2xs rounded-xl h-10 font-medium text-slate-700 hover:border-slate-300"
                  options={[
                    { value: "ALL", label: "All Devices" },
                    { value: "Desktop", label: "Desktop" },
                    { value: "Mobile", label: "Mobile" },
                    { value: "Tablet", label: "Tablet" },
                  ]}
                />
              </div>

              <Button
                variant="outline"
                onClick={fetchLoginLogs}
                disabled={isLoadingLogs}
                className="h-10 gap-2 cursor-pointer rounded-xl font-semibold hover:bg-orange-50 hover:text-orange-600 border-slate-200 shrink-0"
              >
                <RefreshCw className={cn("w-4 h-4", isLoadingLogs && "animate-spin text-orange-600")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Logins Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <table className="w-full table-fixed text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-[28%]">User & Role</th>
                  <th className="py-3.5 px-4 w-[18%]">Status & Browser</th>
                  <th className="py-3.5 px-4 w-[20%]">Device & OS</th>
                  <th className="py-3.5 px-4 w-[20%]">IP Address & Location</th>
                  <th className="py-3.5 px-4 w-[14%]">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoadingLogs && logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                      <span>Loading login records...</span>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No login audit logs found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or filters.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const badgeStyle = getRoleColorBadge(log.role);
                    const displayName = log.full_name || log.email.split("@")[0];
                    const initials = displayName.slice(0, 2).toUpperCase();

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* User & Role */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 border border-orange-100 font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 truncate" title={displayName}>
                                {displayName}
                              </div>
                              <div className="text-xs text-slate-500 truncate" title={log.email}>
                                {log.email}
                              </div>
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
                            </div>
                          </div>
                        </td>

                        {/* Status & Browser */}
                        <td className="py-3.5 px-4">
                          <div className="min-w-0">
                            {log.status === "SUCCESS" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1.5 w-fit font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>SUCCESS</span>
                              </Badge>
                            ) : (
                              <div>
                                <Badge className="bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center gap-1.5 w-fit font-bold text-[11px]">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>FAILED</span>
                                </Badge>
                                {log.failure_reason && (
                                  <p className="text-[11px] text-rose-500 mt-1 truncate" title={log.failure_reason}>
                                    {log.failure_reason}
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="mt-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 truncate max-w-full" title={log.browser || "Unknown Browser"}>
                                <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{log.browser || "Unknown Browser"}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Device & OS */}
                        <td className="py-3.5 px-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                {log.device_type === "Mobile" ? (
                                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : log.device_type === "Tablet" ? (
                                  <Tablet className="w-4 h-4 text-amber-600 shrink-0" />
                                ) : (
                                  <Monitor className="w-4 h-4 text-orange-600 shrink-0" />
                                )}
                                <span className="font-bold text-slate-800 text-xs">{log.device_type || "Desktop"}</span>
                              </div>
                              {log.device_model && (
                                <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-[110px]" title={log.device_model}>
                                  {log.device_model}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-slate-600">{log.os || "Unknown OS"}</span>
                              {log.screen_resolution && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  • {log.screen_resolution}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* IP Address & Location */}
                        <td className="py-3.5 px-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 w-fit max-w-full">
                              <span className="truncate max-w-[130px] sm:max-w-[160px]" title={log.ip_address || "127.0.0.1"}>
                                {log.ip_address || "127.0.0.1"}
                              </span>
                              <button
                                onClick={() => handleCopyIp(log.ip_address || "127.0.0.1")}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer ml-1 p-0.5 rounded hover:bg-slate-200/50 shrink-0"
                                title="Copy IP"
                              >
                                {copiedIp === (log.ip_address || "127.0.0.1") ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {(log.city || log.country) && (
                              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate" title={[log.city, log.country].filter(Boolean).join(", ")}>
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{[log.city, log.country].filter(Boolean).join(", ")}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          <div className="font-semibold text-slate-800">
                            {new Date(log.created_at).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">
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

            {/* Pagination */}
          {totalLogs > 0 && (
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
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

      {/* ==================== TAB 3: REPOPULATE & RESTORE ==================== */}
      {activeTab === "restore" && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {/* File Upload Zone */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                  <Upload className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                  Upload Backup Archive or JSON File to Repopulate Database
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Upload a previously exported <code className="text-emerald-600 font-mono font-semibold">.zip</code> archive or <code className="text-indigo-600 font-mono font-semibold">.json</code> data snapshot to synchronize or restore tables into the live database.
              </p>
            </div>

            <div className="group border-2 border-dashed border-slate-300 hover:border-orange-500 bg-slate-50/50 hover:bg-orange-50/20 rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer relative shadow-inner">
          <input
            type="file"
            accept=".json,.zip"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center justify-center space-y-3.5 pointer-events-none">
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-orange-600 shadow-sm group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-800">
                {uploadedFile ? uploadedFile.name : "Click to select or drag and drop your .zip backup archive or .json file"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Accepts Constrotrait database backup archives (.zip) or JSON dumps (Max 200MB)
              </p>
            </div>
            {isInspecting && (
              <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-4 py-2 rounded-full shadow-2xs">
                <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
                <span>Unpacking archive and analyzing tables and schema compatibility...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inspection & Repopulation Settings */}
      {inspection && (
        <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Backup Verified: Ready to Repopulate</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exported at {new Date(inspection.exportedAt).toLocaleString("en-IN")} by {inspection.exportedBy}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-bold px-3 py-1">
                {inspection.totalTables} Tables Detected
              </Badge>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3 py-1">
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
                  "p-5 rounded-2xl border-2 transition-all cursor-pointer relative shadow-2xs",
                  restoreMode === "UPSERT"
                    ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">Safe Upsert & Merge (Recommended)</span>
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">Non-Destructive</Badge>
                  </div>
                  <input
                    type="radio"
                    checked={restoreMode === "UPSERT"}
                    onChange={() => setRestoreMode("UPSERT")}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
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
                  "p-5 rounded-2xl border-2 transition-all cursor-pointer relative shadow-2xs",
                  restoreMode === "CLEAN_RESTORE"
                    ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">Clean Wipe & Repopulate</span>
                    <Badge className="bg-rose-100 text-rose-800 text-[10px] font-extrabold">Destructive</Badge>
                  </div>
                  <input
                    type="radio"
                    checked={restoreMode === "CLEAN_RESTORE"}
                    onChange={() => setRestoreMode("CLEAN_RESTORE")}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
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
                  className="h-7 text-xs font-bold text-orange-600 hover:text-orange-800 cursor-pointer"
                >
                  Select All
                </Button>
                <span className="text-slate-300">|</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTables([])}
                  className="h-7 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
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
                className="pl-8 h-9 text-xs w-full sm:w-64 rounded-xl border-slate-200 focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200">
              {filteredInspectionTables.map((table: any) => {
                const isSelected = selectedTables.includes(table.name);
                return (
                  <label
                    key={table.name}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none shadow-2xs",
                      isSelected
                        ? "bg-white border-orange-400 font-bold text-slate-900"
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
                        className="rounded text-orange-600 focus:ring-orange-500"
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
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>Warning: Destructive Table Truncation</span>
              </div>
              <p className="text-xs text-rose-600 leading-relaxed">
                This mode will wipe existing records in the selected {selectedTables.length} tables before repopulating from the file. To confirm and proceed, type <span className="font-bold underline">CONFIRM RESTORE</span> below:
              </p>
              <Input
                placeholder='Type "CONFIRM RESTORE" to unlock execution...'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="max-w-md h-9 text-xs bg-white border-rose-300 focus:ring-rose-500 rounded-xl"
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
              variant="custom"
              className={cn(
                "font-extrabold px-8 py-4 h-auto rounded-2xl shadow-lg cursor-pointer flex items-center gap-2 text-sm text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50",
                restoreMode === "CLEAN_RESTORE"
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                  : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/25"
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
              className="cursor-pointer rounded-2xl px-6 py-4 h-auto text-sm font-semibold"
            >
              Cancel
            </Button>
          </div>

          {/* Results Breakdown */}
          {restoreResult && (
            <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 mt-4">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span>Database Repopulation Completed!</span>
              </div>
              <p className="text-xs text-emerald-700">
                A total of <strong>{restoreResult.totalRestored.toLocaleString()} records</strong> were successfully restored across {Object.keys(restoreResult.tableBreakdown || {}).length} tables.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
                {Object.entries(restoreResult.tableBreakdown || {}).map(([table, count]) => (
                  <div key={table} className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-xs flex justify-between shadow-2xs">
                    <span className="font-semibold text-slate-800 truncate">{table}</span>
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
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Database Repopulate / Restore Log
              </h3>
              <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-mono text-xs">
                {restoreLogs.length} events
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Audit trail of all database restoration and synchronization operations executed in PostgreSQL.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchRestoreHistory}
            disabled={isLoadingRestoreLogs}
            className="gap-2 cursor-pointer rounded-xl h-9 hover:bg-orange-50 hover:text-orange-600 font-semibold text-slate-700 border-slate-200"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoadingRestoreLogs && "animate-spin text-orange-600")} />
            <span>Refresh Logs</span>
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200/80 overflow-hidden">
          <table className="w-full table-fixed text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 w-[36%]">File & Mode</th>
                <th className="py-3.5 px-4 w-[18%]">Records Processed</th>
                <th className="py-3.5 px-4 w-[20%]">Restored By</th>
                <th className="py-3.5 px-4 w-[14%]">Timestamp</th>
                <th className="py-3.5 px-4 w-[12%]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoadingRestoreLogs && restoreLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    <span>Loading restore history...</span>
                  </td>
                </tr>
              ) : restoreLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No database restore events recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">Upload and execute a restore file from the Repopulate tab to see history here.</p>
                  </td>
                </tr>
              ) : (
                restoreLogs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* File & Mode */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 shadow-2xs shrink-0">
                          <FileJson className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs font-bold text-slate-900 truncate" title={r.file_name}>
                            {r.file_name}
                          </div>
                          <div className="mt-1">
                            <Badge
                              className={
                                r.restore_mode === "CLEAN_RESTORE"
                                  ? "bg-rose-50 text-rose-700 border-rose-200 font-bold text-[10px]"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]"
                              }
                            >
                              {r.restore_mode}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Records Processed */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">
                      <span className="font-mono font-bold text-slate-900">{r.total_records_processed?.toLocaleString() || 0}</span>
                      <span className="text-slate-400 text-[11px] ml-1">rows</span>
                    </td>

                    {/* Restored By */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-700 border border-orange-100 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {(r.restorer_email || "DV").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 truncate" title={r.restorer_email || "Developer"}>
                            {r.restorer_email ? r.restorer_email.split("@")[0] : "Developer"}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate" title={r.restorer_email || "Developer"}>
                            {r.restorer_email || "System"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div className="font-semibold text-slate-800">
                        {new Date(r.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-slate-400 text-[11px] font-mono">
                        {new Date(r.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge
                        className={
                          r.status === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold text-[11px] flex items-center gap-1.5 w-fit"
                            : "bg-rose-50 text-rose-700 border-rose-200/80 font-bold text-[11px] flex items-center gap-1.5 w-fit"
                        }
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", r.status === "SUCCESS" ? "bg-emerald-500" : "bg-rose-500")} />
                        <span>{r.status}</span>
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
