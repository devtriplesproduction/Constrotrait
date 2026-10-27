/**
 * Client-Side Device, OS, Browser & Public IP Telemetry Collector
 * 
 * Captures accurate device characteristics using modern User-Agent Client Hints
 * (navigator.userAgentData), touch capabilities, screen metrics, Brave detection,
 * and fast client-side public IP verification.
 */

export interface ClientDeviceTelemetry {
  clientIp?: string;
  city?: string;
  region?: string;
  country?: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
  deviceModel?: string;
  os: string;
  browser: string;
  screenResolution?: string;
  isTouch: boolean;
  platform?: string;
  rawUserAgent: string;
}

// Memory cache for IP to avoid redundant requests during a single page session
let cachedIpInfo: {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  timestamp: number;
} | null = null;

/**
 * Fetch the client's genuine public IP address and geolocation with a strict 1.2s timeout.
 * Never hangs or delays form submission.
 */
export async function fetchClientPublicIp(): Promise<{
  ip: string;
  city?: string;
  region?: string;
  country?: string;
} | null> {
  if (typeof window === "undefined") return null;

  // Use cached IP if less than 5 minutes old
  if (cachedIpInfo && Date.now() - cachedIpInfo.timestamp < 300000) {
    return cachedIpInfo;
  }

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 1200);
  });

  // Try ipwho.is first (free, fast, gives IP + City + Country)
  const fetchIpWho = async () => {
    try {
      const res = await fetch("https://ipwho.is/", {
        signal: AbortSignal.timeout ? AbortSignal.timeout(1200) : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ip && data.success !== false) {
          const info = {
            ip: data.ip as string,
            city: data.city as string | undefined,
            region: data.region as string | undefined,
            country: data.country as string | undefined,
            timestamp: Date.now(),
          };
          cachedIpInfo = info;
          return info;
        }
      }
    } catch {
      // Fallback
    }
    return null;
  };

  // Fallback to ipify if ipwho fails
  const fetchIpify = async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json", {
        signal: AbortSignal.timeout ? AbortSignal.timeout(1000) : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ip) {
          const info = {
            ip: data.ip as string,
            timestamp: Date.now(),
          };
          cachedIpInfo = info;
          return info;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  };

  try {
    const result = await Promise.race([fetchIpWho(), timeoutPromise]);
    if (result) return result;
    // Fallback to ipify
    return await Promise.race([fetchIpify(), timeoutPromise]);
  } catch {
    return null;
  }
}

/**
 * Format model names into clean user-friendly descriptions.
 */
function formatDeviceModel(model: string, os: string): string {
  if (!model || model.toLowerCase() === "unknown") {
    if (os.includes("Windows")) return "Windows PC";
    if (os.includes("macOS")) return "Apple Mac";
    if (os.includes("iOS")) return "Apple iPhone";
    if (os.includes("iPad")) return "Apple iPad";
    return "";
  }

  const clean = model.trim();

  // Samsung mappings
  if (/^SM-S9[0-9]{2}/i.test(clean)) return `Samsung Galaxy S Series (${clean})`;
  if (/^SM-A[0-9]{2}/i.test(clean)) return `Samsung Galaxy A Series (${clean})`;
  if (/^SM-M[0-9]{2}/i.test(clean)) return `Samsung Galaxy M Series (${clean})`;
  if (/^SM-F[0-9]{2}/i.test(clean)) return `Samsung Galaxy Z Series (${clean})`;
  if (/^SM-/i.test(clean)) return `Samsung Galaxy (${clean})`;

  // Google Pixel mappings
  if (/pixel/i.test(clean)) return clean;

  // OnePlus
  if (/^CPH|^NE|^PG/i.test(clean)) return `OnePlus (${clean})`;

  // Xiaomi / Redmi / POCO
  if (/^2[1-5][0-9]{2}|^M2[0-9]{3}/i.test(clean)) return `Xiaomi/Redmi (${clean})`;

  // Vivo
  if (/^V2[0-9]{3}/i.test(clean)) return `Vivo (${clean})`;

  // Realme
  if (/^RMX/i.test(clean)) return `Realme (${clean})`;

  return clean;
}

/**
 * Collects full client device telemetry.
 */
export async function collectClientDeviceTelemetry(): Promise<ClientDeviceTelemetry> {
  if (typeof window === "undefined") {
    return {
      deviceType: "Desktop",
      os: "Unknown OS",
      browser: "Unknown Browser",
      isTouch: false,
      rawUserAgent: "",
    };
  }

  const nav = window.navigator as any;
  const ua = nav.userAgent || "";
  const isTouch = (nav.maxTouchPoints || 0) > 0 || window.matchMedia("(pointer: coarse)").matches;
  const screenWidth = window.screen.width || 0;
  const screenHeight = window.screen.height || 0;
  const dpr = window.devicePixelRatio || 1;
  const screenResolution = screenWidth > 0 ? `${screenWidth}x${screenHeight} (${dpr}x)` : undefined;

  let deviceType: "Desktop" | "Mobile" | "Tablet" = "Desktop";
  let os = "Unknown OS";
  let browser = "Unknown Browser";
  let deviceModel = "";

  // 1. Initial Device Type & Touch Detection
  const uaLower = ua.toLowerCase();
  const isIPad =
    /ipad/i.test(ua) || (nav.platform === "MacIntel" && (nav.maxTouchPoints || 0) > 1);
  const isIPhone = /iphone|ipod/i.test(ua);
  const isAndroidUA = /android/i.test(ua);

  if (isIPad || /tablet|playbook|silk/i.test(ua)) {
    deviceType = "Tablet";
  } else if (isIPhone || isAndroidUA || /mobile|blackberry|iemobile/i.test(ua)) {
    deviceType = "Mobile";
  }

  // 2. High-Entropy Client Hints (Chromium: Chrome, Brave, Edge, Samsung Internet, Opera)
  const uaData = nav.userAgentData;
  if (uaData) {
    if (uaData.mobile === true) {
      deviceType = "Mobile";
    }

    try {
      const highEntropy = await uaData.getHighEntropyValues([
        "platform",
        "platformVersion",
        "architecture",
        "model",
        "bitness",
        "uaFullVersion",
      ]);

      const platform = highEntropy.platform || uaData.platform || "";

      // Windows 11 vs Windows 10
      if (platform.toLowerCase() === "windows") {
        deviceType = "Desktop";
        const majorVersion = parseInt((highEntropy.platformVersion || "0").split(".")[0], 10);
        // Windows 11 returns platformVersion starting with 13.0.0 or higher
        if (majorVersion >= 13) {
          os = "Windows 11";
        } else if (majorVersion >= 1) {
          os = "Windows 10";
        } else {
          os = "Windows 10/11";
        }
        const bitness = highEntropy.bitness ? `${highEntropy.bitness}-bit` : "64-bit";
        deviceModel = `Windows PC (${bitness})`;
      } else if (platform.toLowerCase() === "android") {
        deviceType = uaData.mobile ? "Mobile" : "Tablet";
        // True Android version without the "Android 10; K" freeze
        if (highEntropy.platformVersion) {
          const androidMajor = highEntropy.platformVersion.split(".")[0];
          os = `Android ${androidMajor}`;
        } else {
          os = "Android";
        }
        if (highEntropy.model) {
          deviceModel = formatDeviceModel(highEntropy.model, "Android");
        }
      } else if (platform.toLowerCase() === "macos") {
        deviceType = "Desktop";
        const v = highEntropy.platformVersion;
        if (v) {
          const major = parseInt(v.split(".")[0], 10);
          if (major >= 15) os = `macOS Sequoia (${v})`;
          else if (major >= 14) os = `macOS Sonoma (${v})`;
          else if (major >= 13) os = `macOS Ventura (${v})`;
          else os = `macOS (${v})`;
        } else {
          os = "macOS";
        }
        deviceModel = "Apple Mac";
      } else if (platform.toLowerCase() === "linux") {
        // Sarang Bhosale fix: if mobile/touch, it's actually an Android in desktop mode!
        if (uaData.mobile || (isTouch && screenWidth <= 1024)) {
          deviceType = "Mobile";
          os = highEntropy.platformVersion ? `Android ${highEntropy.platformVersion.split(".")[0]}` : "Android";
          deviceModel = highEntropy.model ? formatDeviceModel(highEntropy.model, "Android") : "Android Mobile";
        } else {
          deviceType = "Desktop";
          os = "Linux";
          deviceModel = "Linux PC";
        }
      }
    } catch {
      // Fallback
    }
  }

  // 3. Fallback OS Detection when Client Hints didn't resolve
  if (os === "Unknown OS") {
    if (isIPad) {
      deviceType = "Tablet";
      os = "iPadOS";
      deviceModel = "Apple iPad";
      const match = ua.match(/os (\d+[._]\d+([._]\d+)?)/i);
      if (match) os = `iPadOS ${match[1].replace(/_/g, ".")}`;
    } else if (isIPhone) {
      deviceType = "Mobile";
      deviceModel = "Apple iPhone";
      const match = ua.match(/os (\d+[._]\d+([._]\d+)?)/i);
      os = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
    } else if (isAndroidUA) {
      deviceType = /mobile/i.test(ua) ? "Mobile" : "Tablet";
      const match = ua.match(/android (\d+(\.\d+)?)/i);
      os = match ? `Android ${match[1]}` : "Android";
      const modelMatch = ua.match(/\(([^)]+)\)/);
      if (modelMatch) {
        const parts = modelMatch[1].split(";");
        const lastPart = parts[parts.length - 1]?.trim();
        if (lastPart && !/build/i.test(lastPart)) {
          deviceModel = formatDeviceModel(lastPart, "Android");
        }
      }
    } else if (/windows nt 10\.0/i.test(ua)) {
      deviceType = "Desktop";
      os = "Windows 10/11";
      deviceModel = "Windows PC";
    } else if (/windows/i.test(ua)) {
      deviceType = "Desktop";
      os = "Windows";
      deviceModel = "Windows PC";
    } else if (/macintosh|mac os x/i.test(ua)) {
      deviceType = "Desktop";
      os = "macOS";
      deviceModel = "Apple Mac";
    } else if (/linux/i.test(ua)) {
      // If mobile or touch detected with small screen, it's Android Desktop mode
      if (isTouch && screenWidth <= 1024) {
        deviceType = "Mobile";
        os = "Android";
        deviceModel = "Android Mobile (Desktop Mode)";
      } else {
        deviceType = "Desktop";
        os = "Linux";
        deviceModel = "Linux PC";
      }
    }
  }

  // 4. Accurate Browser Detection (including Brave)
  let isBrave = false;
  try {
    if (nav.brave && typeof nav.brave.isBrave === "function") {
      isBrave = await nav.brave.isBrave();
    }
  } catch {
    // Ignore
  }

  if (isBrave) {
    const chromeMatch = ua.match(/chrome\/(\d+(\.\d+)?)/i);
    browser = chromeMatch ? `Brave (${chromeMatch[1]})` : "Brave Browser";
  } else if (/edg\/|edge\//i.test(ua)) {
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

  // 5. Fetch Public IP
  const ipInfo = await fetchClientPublicIp();

  return {
    clientIp: ipInfo?.ip,
    city: ipInfo?.city,
    region: ipInfo?.region,
    country: ipInfo?.country,
    deviceType,
    deviceModel: deviceModel || undefined,
    os,
    browser,
    screenResolution,
    isTouch,
    platform: nav.platform,
    rawUserAgent: ua,
  };
}
