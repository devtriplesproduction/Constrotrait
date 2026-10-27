export interface ParsedDeviceInfo {
  deviceType: "Desktop" | "Mobile" | "Tablet";
  browser: string;
  os: string;
  rawUserAgent: string;
  deviceModel?: string;
  city?: string;
  country?: string;
}

/**
 * Checks if an IP is a local, private, or loopback IP
 */
export function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.trim().replace(/^::ffff:/, "");
  if (
    clean === "127.0.0.1" ||
    clean === "::1" ||
    clean === "localhost" ||
    clean === "0.0.0.0" ||
    clean.startsWith("127.")
  ) {
    return true;
  }
  // RFC 1918 & RFC 3927 private ranges
  // 10.0.0.0 - 10.255.255.255
  if (/^10\./.test(clean)) return true;
  // 172.16.0.0 - 172.31.255.255
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  // 192.168.0.0 - 192.168.255.255
  if (/^192\.168\./.test(clean)) return true;
  // 169.254.0.0 - 169.254.255.255 (Link-local)
  if (/^169\.254\./.test(clean)) return true;
  // IPv6 ULA / link-local
  if (/^(fc00|fe80)/i.test(clean)) return true;

  return false;
}

/**
 * Normalizes client IP address from header sources with strict hierarchy.
 * Prioritizes trusted edge headers (Cloudflare, Akamai) and filters out private proxy hops in x-forwarded-for.
 */
export function extractClientIp(
  headerList: { get: (name: string) => string | null },
  fallbackClientIp?: string | null
): string {
  // 1. Cloudflare / Enterprise True-Client IP
  const cfIp = headerList.get("cf-connecting-ip");
  if (cfIp && !isPrivateOrLocalIp(cfIp)) return cleanIp(cfIp);

  const trueClientIp = headerList.get("true-client-ip");
  if (trueClientIp && !isPrivateOrLocalIp(trueClientIp)) return cleanIp(trueClientIp);

  // 2. Direct Reverse Proxy Real IP
  const realIp = headerList.get("x-real-ip");
  if (realIp && !isPrivateOrLocalIp(realIp)) return cleanIp(realIp);

  // 3. Client IP Header
  const clientIpHeader = headerList.get("x-client-ip");
  if (clientIpHeader && !isPrivateOrLocalIp(clientIpHeader)) return cleanIp(clientIpHeader);

  // 4. X-Forwarded-For: find the first non-private, public IP in the proxy chain
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    for (const ip of ips) {
      if (ip && !isPrivateOrLocalIp(ip)) {
        return cleanIp(ip);
      }
    }
  }

  // 5. Fastly / Cluster headers
  const fastlyIp = headerList.get("fastly-client-ip");
  if (fastlyIp && !isPrivateOrLocalIp(fastlyIp)) return cleanIp(fastlyIp);

  const clusterIp = headerList.get("x-cluster-client-ip");
  if (clusterIp && !isPrivateOrLocalIp(clusterIp)) return cleanIp(clusterIp);

  // 6. If server only sees localhost / internal network, but client verified its public IP:
  if (fallbackClientIp && !isPrivateOrLocalIp(fallbackClientIp)) {
    return cleanIp(fallbackClientIp);
  }

  // 7. Fallback to first IP in forwarded or real IP even if private
  if (cfIp) return cleanIp(cfIp);
  if (realIp) return cleanIp(realIp);
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return cleanIp(first);
  }

  return "127.0.0.1 (Localhost)";
}

/**
 * Extracts location information (City & Country) from edge headers if available.
 */
export function extractGeoLocation(headerList: { get: (name: string) => string | null }): {
  city?: string;
  country?: string;
} {
  const city =
    headerList.get("cf-ipcity") ||
    headerList.get("x-vercel-ip-city") ||
    headerList.get("x-geo-city") ||
    undefined;

  const country =
    headerList.get("cf-ipcountry") ||
    headerList.get("x-vercel-ip-country") ||
    headerList.get("x-geo-country") ||
    undefined;

  return {
    city: city ? decodeURIComponent(city) : undefined,
    country: country || undefined,
  };
}

export function cleanIp(ip: string): string {
  let cleaned = ip.trim();
  if (cleaned.startsWith("::ffff:")) {
    cleaned = cleaned.substring(7);
  }
  if (cleaned === "::1" || cleaned === "localhost") {
    return "127.0.0.1 (Localhost)";
  }
  return cleaned;
}

/**
 * Parses user-agent header string and optional Client Hint headers into accurate device metadata.
 */
export function parseUserAgent(
  userAgent: string | null | undefined,
  headerList?: { get: (name: string) => string | null } | null
): ParsedDeviceInfo {
  const ua = userAgent || "Unknown";
  const uaLower = ua.toLowerCase();

  // Edge Location
  const geo = headerList ? extractGeoLocation(headerList) : {};

  // Check Client Hints Headers if sent by browser
  const secChPlatform = headerList?.get("sec-ch-ua-platform")?.replace(/"/g, "") || "";
  const secChPlatformVersion = headerList?.get("sec-ch-ua-platform-version")?.replace(/"/g, "") || "";
  const secChModel = headerList?.get("sec-ch-ua-model")?.replace(/"/g, "") || "";
  const secChMobile = headerList?.get("sec-ch-ua-mobile") === "?1";

  // Device Type Detection
  let deviceType: "Desktop" | "Mobile" | "Tablet" = "Desktop";

  if (/ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk/i.test(ua)) {
    deviceType = "Tablet";
  } else if (secChMobile || /mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop|android.*mobile/i.test(ua)) {
    deviceType = "Mobile";
  }

  // OS & Device Model Detection
  let os = "Unknown OS";
  let deviceModel: string | undefined = undefined;

  // 1. Windows with Windows 11 precision
  if (/windows nt 10\.0/i.test(ua) || secChPlatform.toLowerCase() === "windows") {
    deviceType = "Desktop";
    if (secChPlatformVersion) {
      const major = parseInt(secChPlatformVersion.split(".")[0], 10);
      os = major >= 13 ? "Windows 11" : "Windows 10";
    } else {
      os = "Windows 10/11";
    }
    deviceModel = "Windows PC (64-bit)";
  } else if (/windows nt 6\.3/i.test(ua)) {
    os = "Windows 8.1";
    deviceModel = "Windows PC";
  } else if (/windows nt 6\.2/i.test(ua)) {
    os = "Windows 8";
    deviceModel = "Windows PC";
  } else if (/windows nt 6\.1/i.test(ua)) {
    os = "Windows 7";
    deviceModel = "Windows PC";
  } else if (/windows/i.test(ua)) {
    os = "Windows";
    deviceModel = "Windows PC";
  } else if (/macintosh|mac os x/i.test(ua)) {
    deviceType = "Desktop";
    const match = ua.match(/mac os x (\d+[._]\d+([._]\d+)?)/i);
    os = match ? `macOS ${match[1].replace(/_/g, ".")}` : "macOS";
    deviceModel = "Apple Mac";
  } else if (/iphone/i.test(ua)) {
    deviceType = "Mobile";
    const match = ua.match(/os (\d+[._]\d+([._]\d+)?)/i);
    os = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
    deviceModel = "Apple iPhone";
  } else if (/ipad/i.test(ua)) {
    deviceType = "Tablet";
    const match = ua.match(/os (\d+[._]\d+([._]\d+)?)/i);
    os = match ? `iPadOS ${match[1].replace(/_/g, ".")}` : "iPadOS";
    deviceModel = "Apple iPad";
  } else if (/android/i.test(ua) || secChPlatform.toLowerCase() === "android") {
    deviceType = secChMobile ? "Mobile" : "Tablet";
    if (secChPlatformVersion) {
      os = `Android ${secChPlatformVersion.split(".")[0]}`;
    } else {
      const match = ua.match(/android (\d+(\.\d+)?)/i);
      os = match ? `Android ${match[1]}` : "Android";
    }
    if (secChModel) {
      deviceModel = secChModel;
    }
  } else if (/linux/i.test(ua)) {
    // If client hint says mobile or touch mobile
    if (secChMobile || secChPlatform.toLowerCase() === "android") {
      deviceType = "Mobile";
      os = "Android";
      deviceModel = secChModel || "Android Mobile (Desktop Mode)";
    } else {
      deviceType = "Desktop";
      os = "Linux";
      deviceModel = "Linux PC";
    }
  } else if (/cros/i.test(ua)) {
    os = "ChromeOS";
    deviceModel = "Chromebook";
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
    deviceModel,
    city: geo.city,
    country: geo.country,
  };
}
