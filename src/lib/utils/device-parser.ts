export interface ParsedDeviceInfo {
  deviceType: "Desktop" | "Mobile" | "Tablet";
  browser: string;
  os: string;
  rawUserAgent: string;
}

/**
 * Parses user-agent header string into deviceType, browser, and os.
 */
export function parseUserAgent(userAgent: string | null | undefined): ParsedDeviceInfo {
  const ua = userAgent || "Unknown";

  // Device Type Detection
  let deviceType: "Desktop" | "Mobile" | "Tablet" = "Desktop";
  const uaLower = ua.toLowerCase();

  if (/ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk/i.test(ua)) {
    deviceType = "Tablet";
  } else if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop|android.*mobile/i.test(ua)) {
    deviceType = "Mobile";
  }

  // OS Detection
  let os = "Unknown OS";
  if (/windows nt 10\.0/i.test(ua)) {
    os = "Windows 10/11";
  } else if (/windows nt 6\.3/i.test(ua)) {
    os = "Windows 8.1";
  } else if (/windows nt 6\.2/i.test(ua)) {
    os = "Windows 8";
  } else if (/windows nt 6\.1/i.test(ua)) {
    os = "Windows 7";
  } else if (/windows/i.test(ua)) {
    os = "Windows";
  } else if (/macintosh|mac os x/i.test(ua)) {
    const match = ua.match(/mac os x (\d+[._]\d+([._]\d+)?)/i);
    os = match ? `macOS ${match[1].replace(/_/g, ".")}` : "macOS";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/os (\d+[._]\d+([._]\d+)?)/i);
    os = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
  } else if (/android/i.test(ua)) {
    const match = ua.match(/android (\d+(\.\d+)?)/i);
    os = match ? `Android ${match[1]}` : "Android";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  } else if (/cros/i.test(ua)) {
    os = "ChromeOS";
  }

  // Browser Detection
  let browser = "Unknown Browser";
  if (/edg\/|edge\//i.test(ua)) {
    const match = ua.match(/edg(?:e)?\/(\d+(\.\d+)?)/i);
    browser = match ? `Edge ${match[1]}` : "Edge";
  } else if (/opr\/|opera/i.test(ua)) {
    const match = ua.match(/(?:opr|opera)[\/\s](\d+(\.\d+)?)/i);
    browser = match ? `Opera ${match[1]}` : "Opera";
  } else if (/samsungbrowser/i.test(ua)) {
    const match = ua.match(/samsungbrowser\/(\d+(\.\d+)?)/i);
    browser = match ? `Samsung Internet ${match[1]}` : "Samsung Internet";
  } else if (/chrome|crios/i.test(ua)) {
    const match = ua.match(/(?:chrome|crios)\/(\d+(\.\d+)?)/i);
    browser = match ? `Chrome ${match[1]}` : "Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    const match = ua.match(/(?:firefox|fxios)\/(\d+(\.\d+)?)/i);
    browser = match ? `Firefox ${match[1]}` : "Firefox";
  } else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    const match = ua.match(/version\/(\d+(\.\d+)?)/i);
    browser = match ? `Safari ${match[1]}` : "Safari";
  }

  return {
    deviceType,
    browser,
    os,
    rawUserAgent: ua,
  };
}

/**
 * Normalizes client IP address from header sources.
 */
export function extractClientIp(headerList: { get: (name: string) => string | null }): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return cleanIp(firstIp);
  }

  const realIp = headerList.get("x-real-ip");
  if (realIp) return cleanIp(realIp);

  const cfIp = headerList.get("cf-connecting-ip");
  if (cfIp) return cleanIp(cfIp);

  return "127.0.0.1";
}

function cleanIp(ip: string): string {
  let cleaned = ip.trim();
  if (cleaned.startsWith("::ffff:")) {
    cleaned = cleaned.substring(7);
  }
  if (cleaned === "::1" || cleaned === "localhost") {
    return "127.0.0.1 (Localhost)";
  }
  return cleaned;
}
