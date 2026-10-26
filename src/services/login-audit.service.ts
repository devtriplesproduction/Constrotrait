import { createAdminClient } from "@/lib/supabase/admin";
import { parseUserAgent, extractClientIp } from "@/lib/utils/device-parser";

export interface RecordLoginParams {
  userId?: string | null;
  email: string;
  fullName?: string | null;
  role?: string | null;
  status: "SUCCESS" | "FAILED";
  failureReason?: string | null;
  headers?: { get: (name: string) => string | null } | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface LoginAuditFilter {
  search?: string;
  status?: string;
  role?: string;
  deviceType?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Record a login event into login_audit_logs
 */
export async function recordLoginAudit(params: RecordLoginParams): Promise<void> {
  try {
    let uaString = params.userAgent || "";
    let ip = params.ipAddress || "";

    if (params.headers) {
      if (!uaString) uaString = params.headers.get("user-agent") || "";
      if (!ip) ip = extractClientIp(params.headers);
    }

    const { deviceType, browser, os } = parseUserAgent(uaString);
    const supabase = createAdminClient();

    const { error } = await supabase.from("login_audit_logs").insert({
      user_id: params.userId ?? null,
      email: params.email.toLowerCase().trim(),
      full_name: params.fullName ?? null,
      role: params.role ?? null,
      ip_address: ip || "127.0.0.1",
      user_agent: uaString || "Unknown",
      device_type: deviceType,
      browser,
      os,
      status: params.status,
      failure_reason: params.failureReason ?? null,
    });

    if (error) {
      console.error("Failed to record login audit log:", error);
    }
  } catch (err) {
    console.error("Unexpected error in recordLoginAudit:", err);
  }
}

/**
 * Fetch paginated login audit logs with filtering and analytics summary
 */
export async function getLoginAuditLogs(filters: LoginAuditFilter = {}) {
  try {
    const supabase = createAdminClient();
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(5, Math.min(100, filters.pageSize || 15));
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("login_audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }

    if (filters.deviceType && filters.deviceType !== "ALL") {
      query = query.eq("device_type", filters.deviceType);
    }

    if (filters.role && filters.role !== "ALL") {
      query = query.ilike("role", `%${filters.role}%`);
    }

    if (filters.search) {
      const q = filters.search.trim();
      query = query.or(
        `email.ilike.%${q}%,full_name.ilike.%${q}%,ip_address.ilike.%${q}%,browser.ilike.%${q}%,os.ilike.%${q}%`
      );
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data: logs, count, error } = await query;

    if (error) {
      console.error("Error fetching login audit logs:", error);
      return {
        logs: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        stats: null,
      };
    }

    // Analytics snapshot (from recent 500 logins for speed)
    const { data: recentStatsLogs } = await supabase
      .from("login_audit_logs")
      .select("status, device_type, browser, created_at, email")
      .order("created_at", { ascending: false })
      .limit(500);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let successCount = 0;
    let failedCount = 0;
    let todayCount = 0;
    const uniqueEmails = new Set<string>();
    const devicesMap: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const browserMap: Record<string, number> = {};

    (recentStatsLogs || []).forEach((item) => {
      if (item.status === "SUCCESS") successCount++;
      else failedCount++;

      if (item.email) uniqueEmails.add(item.email);

      if (new Date(item.created_at).getTime() >= startOfToday) {
        todayCount++;
      }

      const dev = item.device_type || "Desktop";
      devicesMap[dev] = (devicesMap[dev] || 0) + 1;

      const br = item.browser ? item.browser.split(" ")[0] : "Other";
      browserMap[br] = (browserMap[br] || 0) + 1;
    });

    const topBrowsers = Object.entries(browserMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      logs: logs || [],
      total,
      page,
      pageSize,
      totalPages,
      stats: {
        totalLogins: total,
        recentSample: recentStatsLogs?.length || 0,
        successCount,
        failedCount,
        todayCount,
        uniqueUsersCount: uniqueEmails.size,
        devicesBreakdown: devicesMap,
        topBrowsers,
      },
    };
  } catch (err) {
    console.error("Error in getLoginAuditLogs:", err);
    return {
      logs: [],
      total: 0,
      page: 1,
      pageSize: 15,
      totalPages: 0,
      stats: null,
    };
  }
}
