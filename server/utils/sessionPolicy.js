const HOUR = 60 * 60 * 1000;

// Every sign-in lasts 9 hours, with or without Remember Me. Remember Me only decides whether the
// browser keeps the login after tabs or the browser are closed. The web app signs out when 9 hours are over.
export const SESSION_HOURS = 9;
export const SESSION_TTL_MS = SESSION_HOURS * HOUR;

// Inactivity timeout in milliseconds. 0 disables it. Configured with SESSION_IDLE_MINUTES.
export const idleTimeoutMs = (env = process.env) => {
  const minutes = Number(env.SESSION_IDLE_MINUTES);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : 0;
};

export const isSessionExpired = (session, now = Date.now(), idleMs = 0) => {
  if (!session || session.revokedAt) return true;
  if (new Date(session.expiresAt).getTime() <= now) return true;
  if (idleMs > 0 && now - new Date(session.lastSeenAt).getTime() > idleMs) return true;
  return false;
};

// Short readable label such as "Chrome on Windows" from a User-Agent string.
export const describeDevice = (userAgent = "") => {
  const ua = String(userAgent);
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Browser";
  const os =
    /Windows/.test(ua) ? "Windows" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iOS/.test(ua) ? "iOS" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" : "unknown device";
  return `${browser} on ${os}`;
};

// Password rules for staff-grade and new customer passwords.
export const validatePasswordStrength = (password) => {
  const value = String(password || "");
  if (value.length < 8) return "Password must be at least 8 characters";
  if (!/[a-z]/i.test(value) || !/\d/.test(value)) return "Password must contain letters and numbers";
  return null;
};

export const MAX_FAILED_LOGINS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

// Returns the lock fields to store after one more failed login.
export const nextFailedLoginState = (currentCount, now = Date.now()) => {
  const failedLoginCount = (currentCount || 0) + 1;
  if (failedLoginCount >= MAX_FAILED_LOGINS) {
    return { failedLoginCount: 0, lockUntil: new Date(now + LOCK_DURATION_MS) };
  }
  return { failedLoginCount, lockUntil: undefined };
};

export const isLocked = (user, now = Date.now()) => Boolean(user?.lockUntil && new Date(user.lockUntil).getTime() > now);
