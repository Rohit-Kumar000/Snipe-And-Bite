import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ROLES } from "../utils/permissions.js";
import { idleTimeoutMs, isSessionExpired } from "../utils/sessionPolicy.js";

const TOUCH_INTERVAL_MS = 60 * 1000;

// Machine readable reasons. The web app signs the person out only when it sees one of these,
// so a wrong password on a sensitive action (also a 401) never ends a healthy session.
export const SESSION_EXPIRED = "SESSION_EXPIRED";
export const ACCOUNT_SUSPENDED = "ACCOUNT_SUSPENDED";

// Auth routes the Super Admin may still use before two-factor authentication is set up.
const SETUP_ALLOWED_PREFIXES = ["/api/auth/me", "/api/auth/2fa", "/api/auth/logout"];

const PASSWORD_CHANGE_ALLOWED_PREFIXES = ["/api/auth/me", "/api/auth/logout", "/api/users/password"];

const fail = (res, status, message, code) => {
  res.status(status);
  const error = new Error(message);
  error.code = code;
  throw error;
};

// Requires a valid JWT and a live server-side session, then attaches the user to req.user.
export const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }
  if (!token) fail(res, 401, "Not authorized, please login", SESSION_EXPIRED);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    fail(res, 401, "Session expired, please login again", SESSION_EXPIRED);
  }
  if (decoded.purpose || !decoded.sid) fail(res, 401, "Session expired, please login again", SESSION_EXPIRED);

  const [session, user] = await Promise.all([Session.findById(decoded.sid), User.findById(decoded.id)]);
  if (isSessionExpired(session, Date.now(), idleTimeoutMs())) {
    fail(res, 401, "Session expired, please login again", SESSION_EXPIRED);
  }
  if (!user || String(session.user) !== String(user._id)) fail(res, 401, "User no longer exists", SESSION_EXPIRED);
  if (user.isBlocked) fail(res, 403, "Your account is suspended. Please contact support", ACCOUNT_SUSPENDED);

  if (Date.now() - new Date(session.lastSeenAt).getTime() > TOUCH_INTERVAL_MS) {
    session.lastSeenAt = new Date();
    await session.save();
  }

  // The Super Admin must finish two-factor setup before using anything else.
  if (user.role === ROLES.SUPER_ADMIN && !user.twoFactor?.enabled) {
    const allowed = SETUP_ALLOWED_PREFIXES.some((prefix) => req.originalUrl.startsWith(prefix));
    if (!allowed) fail(res, 403, "Two-factor authentication must be enabled before continuing", "2FA_SETUP_REQUIRED");
  }

  // A forced password change blocks everything except changing the password and signing out.
  if (user.mustChangePassword) {
    const allowed = PASSWORD_CHANGE_ALLOWED_PREFIXES.some((prefix) => req.originalUrl.startsWith(prefix));
    if (!allowed) fail(res, 403, "You must change your password before continuing", "PASSWORD_CHANGE_REQUIRED");
  }

  req.user = user;
  req.sessionId = String(session._id);
  req.sessionExpiresAt = session.expiresAt;
  next();
});
