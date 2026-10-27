/**
 * Session Inactivity and Auto-Logout Configuration
 */
export const SESSION_CONFIG = {
  // Total inactivity time allowed before auto-logout (in minutes)
  INACTIVITY_TIMEOUT_MINUTES: 60,

  // Milliseconds equivalent (60 minutes = 3,600,000 ms)
  get INACTIVITY_TIMEOUT_MS() {
    return this.INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;
  },

  // Warning countdown duration shown to user before logout (2 minutes = 120s)
  WARNING_DURATION_SECONDS: 120,

  get WARNING_DURATION_MS() {
    return this.WARNING_DURATION_SECONDS * 1000;
  },

  // Interval to check inactivity elapsed time
  CHECK_INTERVAL_MS: 2000,

  // Throttle writes to localStorage during continuous user events
  ACTIVITY_THROTTLE_MS: 5000,

  // Browser storage keys for cross-tab synchronization
  STORAGE_KEYS: {
    LAST_ACTIVE: "constrotrait_session_last_active",
    LOGOUT_BROADCAST: "constrotrait_session_logout_broadcast",
  },
} as const;
