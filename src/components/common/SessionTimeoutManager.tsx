"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Clock, ShieldAlert, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SESSION_CONFIG } from "@/config/session";
import { logoutAction } from "@/actions/auth.actions";
import { createClient } from "@/lib/supabase/client";

function formatRemainingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function SessionTimeoutManager() {
  const [mounted, setMounted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(SESSION_CONFIG.WARNING_DURATION_SECONDS);

  const lastActiveRef = useRef<number>(Date.now());
  const lastThrottleRef = useRef<number>(0);
  const isLoggingOutRef = useRef<boolean>(false);
  const warningActiveRef = useRef<boolean>(false);

  // Synchronize ref with state
  warningActiveRef.current = showWarning;

  // Perform logout and notify other tabs
  const performLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      // Broadcast logout to any other open tabs
      localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.LOGOUT_BROADCAST, String(Date.now()));
    } catch {
      // Ignore localStorage exceptions
    }

    try {
      // Sign out from browser Supabase auth
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Client auth signOut error:", err);
    }

    try {
      // Server action to clear cookies and redirect
      await logoutAction("timeout");
    } catch {
      // Fallback in case of navigation redirect exception
      window.location.href = "/login?reason=timeout";
    }
  }, []);

  // Update activity timestamp
  const recordActivity = useCallback((force = false) => {
    // If the warning modal is currently showing, don't silently dismiss via micro-mouse moves;
    // let user click "Stay Logged In" or explicitly interact
    if (warningActiveRef.current && !force) {
      return;
    }

    const now = Date.now();
    if (force || now - lastThrottleRef.current > SESSION_CONFIG.ACTIVITY_THROTTLE_MS) {
      lastThrottleRef.current = now;
      lastActiveRef.current = now;
      try {
        localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVE, String(now));
      } catch {
        // Storage might be unavailable/restricted
      }

      if (warningActiveRef.current) {
        setShowWarning(false);
      }
    }
  }, []);

  // User explicitly clicks "Stay Logged In"
  const handleStayLoggedIn = () => {
    recordActivity(true);
    setShowWarning(false);
  };

  useEffect(() => {
    setMounted(true);

    // Initialize last active from localStorage if recently set
    try {
      const stored = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVE);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= Date.now()) {
          lastActiveRef.current = parsed;
        } else {
          localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVE, String(Date.now()));
        }
      } else {
        localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVE, String(Date.now()));
      }
    } catch {
      // Ignore
    }

    // Activity event listeners
    const handleUserActivity = () => {
      recordActivity(false);
    };

    const activityEvents = [
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Cross-tab synchronization via storage event
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === SESSION_CONFIG.STORAGE_KEYS.LOGOUT_BROADCAST && event.newValue) {
        // Another tab triggered timeout logout
        if (!isLoggingOutRef.current) {
          isLoggingOutRef.current = true;
          window.location.href = "/login?reason=timeout";
        }
      } else if (event.key === SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVE && event.newValue) {
        // Another tab recorded activity
        const parsed = parseInt(event.newValue, 10);
        if (!isNaN(parsed)) {
          lastActiveRef.current = parsed;
          if (warningActiveRef.current) {
            setShowWarning(false);
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageEvent);

    // Periodic check and tab visibility check
    const checkSessionState = () => {
      if (isLoggingOutRef.current) return;

      const now = Date.now();
      let lastActive = lastActiveRef.current;

      // Always sync with storage if present to pick up multi-tab activity
      try {
        const stored = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVE);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed > lastActive) {
            lastActive = parsed;
            lastActiveRef.current = parsed;
          }
        }
      } catch {
        // Ignore
      }

      const elapsed = now - lastActive;

      // 1. Inactivity period exceeded 60 minutes -> Log out immediately
      if (elapsed >= SESSION_CONFIG.INACTIVITY_TIMEOUT_MS) {
        performLogout();
        return;
      }

      // 2. In warning window (last 2 minutes of the 60 min period)
      const warningThreshold = SESSION_CONFIG.INACTIVITY_TIMEOUT_MS - SESSION_CONFIG.WARNING_DURATION_MS;
      if (elapsed >= warningThreshold) {
        const remainingMs = SESSION_CONFIG.INACTIVITY_TIMEOUT_MS - elapsed;
        const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
        setRemainingSeconds(remainingSec);
        if (!warningActiveRef.current) {
          setShowWarning(true);
        }
      } else {
        if (warningActiveRef.current) {
          setShowWarning(false);
        }
      }
    };

    const intervalId = setInterval(checkSessionState, SESSION_CONFIG.CHECK_INTERVAL_MS);

    // Check immediately when user switches back to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSessionState();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener("storage", handleStorageEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [performLogout, recordActivity]);

  if (!mounted || !showWarning || typeof document === "undefined") {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Dark blur backdrop */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200" />

      {/* Modal card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 text-center animate-in zoom-in-95 duration-200 z-10 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-40 h-40 bg-orange-100 rounded-full blur-2xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-40 h-40 bg-amber-100 rounded-full blur-2xl opacity-60 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Animated Warning Icon */}
          <div className="relative w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
            <span className="absolute inset-0 rounded-2xl bg-amber-400/20 animate-ping opacity-75" />
            <Clock className="w-8 h-8 relative z-10 text-amber-600 animate-pulse" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Inactivity Timeout Warning
          </h3>

          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            You have been inactive for nearly <span className="font-semibold text-slate-700">{SESSION_CONFIG.INACTIVITY_TIMEOUT_MINUTES} minutes</span>. For your security, your session will automatically end in:
          </p>

          {/* Large Countdown Display */}
          <div className="my-5 px-5 py-3 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span className="text-2xl sm:text-3xl font-mono font-extrabold tracking-wider text-amber-900">
              {formatRemainingTime(remainingSeconds)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col-reverse sm:flex-row items-center gap-2.5 mt-2">
            <Button
              variant="outline"
              onClick={performLogout}
              className="w-full sm:w-1/2 h-11 rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Log out</span>
            </Button>

            <Button
              variant="custom"
              onClick={handleStayLoggedIn}
              className="w-full sm:w-1/2 h-11 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold text-sm shadow-[0_4px_14px_0_rgba(234,88,12,0.39)] hover:shadow-[0_6px_20px_rgba(234,88,12,0.23)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-white" />
              <span>Stay Logged In</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
