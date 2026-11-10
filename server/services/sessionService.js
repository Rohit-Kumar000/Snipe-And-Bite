import Session from "../models/Session.js";
import generateToken from "../utils/generateToken.js";
import { SESSION_TTL_MS, describeDevice } from "../utils/sessionPolicy.js";
import { getIp } from "./auditService.js";

const COOKIE_NAME = "token";

// The same flags must be used when the cookie is set and when it is cleared, or the browser keeps it.
const cookieFlags = () => {
  const isProd = process.env.NODE_ENV === "production";
  return { httpOnly: true, secure: isProd, sameSite: isProd ? "none" : "lax" };
};

// Creates a session record and returns the signed token. The web app sends the token in the
// Authorization header. Only a Remember Me session also gets a cookie, so a session without it
// leaves nothing behind in the browser once the tab is closed.
export const startSession = async (req, res, user, { rememberMe = false } = {}) => {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 300);
  const session = await Session.create({
    user: user._id,
    ip: getIp(req),
    userAgent,
    device: describeDevice(userAgent),
    rememberMe,
    expiresAt,
  });

  const token = generateToken({ id: user._id, sid: session._id }, Math.floor(SESSION_TTL_MS / 1000));
  if (rememberMe) res.cookie(COOKIE_NAME, token, { ...cookieFlags(), maxAge: SESSION_TTL_MS });
  else clearSessionCookie(res);
  return { token, session, expiresAt };
};

export const clearSessionCookie = (res) => res.clearCookie(COOKIE_NAME, cookieFlags());

export const revokeSession = (sessionId, reason = "logout") =>
  Session.updateOne({ _id: sessionId, revokedAt: { $exists: false } }, { revokedAt: new Date(), revokedReason: reason });

// Revokes every active session of a user, optionally keeping one (the current device).
export const revokeAllSessions = (userId, { exceptSessionId = null, reason = "revoked" } = {}) => {
  const filter = { user: userId, revokedAt: { $exists: false } };
  if (exceptSessionId) filter._id = { $ne: exceptSessionId };
  return Session.updateMany(filter, { revokedAt: new Date(), revokedReason: reason });
};
