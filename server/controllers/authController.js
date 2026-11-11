import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendEmail, { isEmailConfigured } from "../utils/sendEmail.js";
import { resetPasswordEmail, verifyEmailTemplate } from "../utils/emailTemplates.js";
import { httpError } from "../utils/helpers.js";
import { publicUser } from "../utils/userSerializer.js";
import { ROLES, isEmployeeRole } from "../utils/permissions.js";
import { isLocked, nextFailedLoginState } from "../utils/sessionPolicy.js";
import {
  buildOtpAuthUrl, generateRecoveryCodes, generateSecret, hashRecoveryCode, verifyTotp,
} from "../utils/totp.js";
import { decryptSecret, encryptSecret, isSecretBoxConfigured } from "../utils/secretBox.js";
import { startSession, revokeAllSessions, revokeSession, clearSessionCookie } from "../services/sessionService.js";
import { logAudit } from "../services/auditService.js";
import { notifyUsers } from "../services/notificationService.js";

const TWO_FACTOR_FIELDS = "+twoFactor.secretEnc +twoFactor.pendingSecretEnc +twoFactor.recoveryCodeHashes";
const CHALLENGE_MINUTES = 5;
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer-not-a-real-password", 12);

const sendSession = async (req, res, user, statusCode, { rememberMe = false } = {}) => {
  const { token, expiresAt } = await startSession(req, res, user, { rememberMe });
  user.lastLoginAt = new Date();
  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  await user.save({ validateBeforeSave: false });
  await logAudit(req, { actor: user, action: "LOGIN_SUCCESS", resourceType: "User", resourceId: user._id, summary: `${user.name} signed in` });
  res.status(statusCode).json({
    success: true,
    token,
    rememberMe,
    expiresAt,
    user: publicUser(user),
    twoFactorSetupRequired: user.role === ROLES.SUPER_ADMIN && !user.twoFactor?.enabled,
  });
};

// POST /api/auth/register (public sign-up always creates a customer)
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) throw httpError("Email already registered");

  const user = await User.create({ name, email, phone, password, role: ROLES.CUSTOMER });
  await issueVerificationEmail(user); // never blocks sign-up; skipped when email is not configured
  await sendSession(req, res, user, 201);
});

// Creates a 24 hour confirmation link and emails it. Returns true when an email was sent.
const issueVerificationEmail = async (user) => {
  if (!isEmailConfigured() || user.emailVerified) return false;
  const token = crypto.randomBytes(32).toString("hex");
  user.emailVerifyToken = crypto.createHash("sha256").update(token).digest("hex");
  user.emailVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim();
  const settings = await Settings.getSettings();
  const { subject, html } = verifyEmailTemplate({ user, verifyUrl: `${clientUrl}/verify-email/${token}`, settings });
  return sendEmail({ to: user.email, subject, html });
};

// POST /api/auth/send-verification (signed in)
export const sendVerification = asyncHandler(async (req, res) => {
  if (req.user.emailVerified) return res.json({ success: true, message: "Your email is already confirmed" });
  if (!isEmailConfigured()) throw httpError("Email is not available right now. Please try again later", 503);
  const sent = await issueVerificationEmail(req.user);
  if (!sent) throw httpError("We could not send the email. Please try again later", 502);
  return res.json({ success: true, message: "Confirmation email sent. Check your inbox" });
});

// POST /api/auth/verify-email/:token (public, the link in the email)
export const verifyEmail = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await User.findOne({ emailVerifyToken: hashed, emailVerifyExpire: { $gt: new Date() } }).select("+emailVerifyToken +emailVerifyExpire");
  if (!user) throw httpError("This confirmation link is invalid or has expired");
  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpire = undefined;
  await user.save({ validateBeforeSave: false });
  await logAudit(req, { actor: user, action: "EMAIL_VERIFIED", resourceType: "User", resourceId: user._id, summary: "Email address confirmed" });
  res.json({ success: true, message: "Email confirmed. Thank you" });
});

// POST /api/auth/oauth/exchange  { code }  swaps the short lived code from a social sign-in for a normal session
export const oauthExchange = asyncHandler(async (req, res) => {
  let decoded;
  try {
    decoded = jwt.verify(String(req.body.code || ""), process.env.JWT_SECRET);
  } catch {
    throw httpError("This sign-in link expired. Please try again", 401);
  }
  if (decoded.purpose !== "oauth-exchange") throw httpError("Invalid sign-in request", 401);
  const user = await User.findById(decoded.id).select(`+oauthJti ${TWO_FACTOR_FIELDS}`);
  // The code works once: the stored id is cleared as soon as it is used.
  if (!user || user.isBlocked || !user.oauthJti || user.oauthJti !== decoded.jti) {
    throw httpError("This sign-in link is no longer valid. Please try again", 401);
  }
  user.oauthJti = undefined;
  await user.save({ validateBeforeSave: false });

  // Social sign-in proves who the person is, but 2FA still applies. No session exists until the code is verified.
  if (user.twoFactor?.enabled) {
    const challengeToken = jwt.sign({ id: user._id, purpose: "2fa", rememberMe: Boolean(decoded.rm) }, process.env.JWT_SECRET, { expiresIn: `${CHALLENGE_MINUTES}m` });
    return res.json({ success: true, requires2FA: true, challengeToken });
  }
  await sendSession(req, res, user, 200, { rememberMe: Boolean(decoded.rm) });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  const user = await User.findOne({ email }).select(`+password ${TWO_FACTOR_FIELDS}`);

  if (user && isLocked(user)) {
    throw httpError("Too many failed attempts. This account is locked for 15 minutes", 429);
  }

  // A hash is always compared, so a missing account takes as long as a wrong password.
  const passwordOk = user ? await user.matchPassword(password) : await bcrypt.compare(String(password), DUMMY_HASH).then(() => false);
  if (!user || !passwordOk) {
    if (user) {
      Object.assign(user, nextFailedLoginState(user.failedLoginCount));
      await user.save({ validateBeforeSave: false });
    }
    await logAudit(req, {
      actor: user,
      action: "LOGIN_FAILED",
      resourceType: "User",
      resourceId: user?._id,
      summary: `Failed sign-in attempt for ${email}`,
      meta: { email },
    });
    throw httpError("Invalid email or password", 401);
  }
  if (user.isBlocked) throw httpError("Your account is suspended. Please contact support", 403);

  if (user.twoFactor?.enabled) {
    const challengeToken = jwt.sign(
      { id: user._id, purpose: "2fa", rememberMe: Boolean(rememberMe) },
      process.env.JWT_SECRET,
      { expiresIn: `${CHALLENGE_MINUTES}m` }
    );
    return res.json({ success: true, requires2FA: true, challengeToken });
  }

  await sendSession(req, res, user, 200, { rememberMe: Boolean(rememberMe) });
});

// POST /api/auth/2fa/verify (second step of login, accepts an app code or a recovery code)
export const verifyTwoFactorLogin = asyncHandler(async (req, res) => {
  const { challengeToken, code } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(challengeToken, process.env.JWT_SECRET);
  } catch {
    throw httpError("Verification expired. Please sign in again", 401);
  }
  if (decoded.purpose !== "2fa") throw httpError("Invalid verification request", 401);

  const user = await User.findById(decoded.id).select(TWO_FACTOR_FIELDS);
  if (!user || user.isBlocked || !user.twoFactor?.enabled) throw httpError("Verification failed", 401);
  if (isLocked(user)) throw httpError("This account is temporarily locked", 429);

  const cleaned = String(code || "").trim();
  let valid = false;
  let usedRecovery = false;

  if (/^\d{6}$/.test(cleaned.replace(/\s+/g, ""))) {
    valid = verifyTotp(decryptSecret(user.twoFactor.secretEnc), cleaned);
  } else {
    const hash = hashRecoveryCode(cleaned);
    if (user.twoFactor.recoveryCodeHashes.includes(hash)) {
      user.twoFactor.recoveryCodeHashes = user.twoFactor.recoveryCodeHashes.filter((h) => h !== hash);
      valid = true;
      usedRecovery = true;
    }
  }

  if (!valid) {
    Object.assign(user, nextFailedLoginState(user.failedLoginCount));
    await user.save({ validateBeforeSave: false });
    await logAudit(req, { actor: user, action: "TWO_FACTOR_FAILED", resourceType: "User", resourceId: user._id, summary: "Invalid two-factor code" });
    throw httpError("Invalid verification code", 401);
  }

  if (usedRecovery) {
    await logAudit(req, { actor: user, action: "RECOVERY_CODE_USED", resourceType: "User", resourceId: user._id, summary: "A recovery code was used to sign in" });
  }
  await sendSession(req, res, user, 200, { rememberMe: Boolean(decoded.rememberMe) });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
    const decoded = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
    if (decoded?.sid) {
      await revokeSession(decoded.sid, "logout");
      const user = await User.findById(decoded.id).select("name role");
      if (user) await logAudit(req, { actor: user, action: "LOGOUT", resourceType: "User", resourceId: user._id, summary: `${user.name} signed out` });
    }
  } catch {
    // An invalid or expired token only means there is nothing to revoke.
  }
  clearSessionCookie(res);
  res.json({ success: true, message: "Logged out successfully" });
});

// POST /api/auth/logout-all (every device, including this one)
export const logoutAll = asyncHandler(async (req, res) => {
  await revokeAllSessions(req.user._id, { reason: "logout_all" });
  await logAudit(req, { action: "LOGOUT_ALL", resourceType: "User", resourceId: req.user._id, summary: "Signed out from all devices" });
  clearSessionCookie(res);
  res.json({ success: true, message: "Signed out from all devices" });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: publicUser(req.user),
    twoFactorSetupRequired: req.user.role === ROLES.SUPER_ADMIN && !req.user.twoFactor?.enabled,
    sessionExpiresAt: req.sessionExpiresAt,
  });
});

// GET /api/auth/sessions
export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ user: req.user._id, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
    .sort({ lastSeenAt: -1 })
    .select("device ip lastSeenAt createdAt");
  res.json({
    success: true,
    sessions: sessions.map((s) => ({
      _id: s._id, device: s.device, ip: s.ip, lastSeenAt: s.lastSeenAt, createdAt: s.createdAt,
      current: String(s._id) === req.sessionId,
    })),
  });
});

// DELETE /api/auth/sessions/:id
export const revokeOwnSession = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
  if (!session) throw httpError("Session not found", 404);
  await revokeSession(session._id, "revoked_by_owner");
  res.json({ success: true, message: "Session revoked" });
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  if (!isEmailConfigured()) {
    throw httpError("Password reset email is not available right now. Please contact the restaurant", 503);
  }

  const user = await User.findOne({ email: req.body.email });

  // The same response is returned whether or not the account exists.
  if (user && !user.isBlocked) {
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim();
    const settings = await Settings.getSettings();
    const { subject, html } = resetPasswordEmail({ user, resetUrl: `${clientUrl}/reset-password/${token}`, settings });
    await sendEmail({ to: user.email, subject, html });
    await logAudit(req, { actor: user, action: "PASSWORD_RESET_REQUESTED", resourceType: "User", resourceId: user._id, summary: "Password reset link requested" });
  }

  res.json({ success: true, message: "If an account exists for this email, a reset link has been sent" });
});

// PUT /api/auth/reset-password/:token (also used for staff invitations)
export const resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: new Date() },
  }).select(`+resetPasswordToken +resetPasswordExpire ${TWO_FACTOR_FIELDS}`);

  if (!user) throw httpError("This reset link is invalid or has expired");

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.mustChangePassword = false;
  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  await user.save();

  await revokeAllSessions(user._id, { reason: "password_reset" });
  await logAudit(req, { actor: user, action: "PASSWORD_RESET_COMPLETED", resourceType: "User", resourceId: user._id, summary: "Password was reset with a reset link" });

  // Employees always sign in again so that two-factor authentication is never skipped.
  if (isEmployeeRole(user.role) || user.twoFactor?.enabled) {
    return res.json({ success: true, message: "Password updated. Please sign in with your new password" });
  }
  await sendSession(req, res, user, 200);
});

// POST /api/auth/2fa/setup (creates a pending secret, shown once so it can be added to an authenticator app)
export const setupTwoFactor = asyncHandler(async (req, res) => {
  if (!isSecretBoxConfigured()) {
    throw httpError("Two-factor authentication requires TWO_FACTOR_ENCRYPTION_KEY to be configured on the server", 503);
  }
  const user = await User.findById(req.user._id).select(TWO_FACTOR_FIELDS);
  if (user.twoFactor?.enabled) throw httpError("Two-factor authentication is already enabled");

  const secret = generateSecret();
  user.twoFactor.pendingSecretEnc = encryptSecret(secret);
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    secret,
    otpauthUrl: buildOtpAuthUrl({ secret, accountName: user.email, issuer: "Snipe&Bite" }),
  });
});

// POST /api/auth/2fa/enable (confirms the first code and returns recovery codes once)
export const enableTwoFactor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(TWO_FACTOR_FIELDS);
  if (!user.twoFactor?.pendingSecretEnc) throw httpError("Start the setup first");

  const secret = decryptSecret(user.twoFactor.pendingSecretEnc);
  if (!verifyTotp(secret, req.body.code)) throw httpError("That code is not correct. Check your authenticator app and try again");

  const recoveryCodes = generateRecoveryCodes(10);
  user.twoFactor.enabled = true;
  user.twoFactor.enabledAt = new Date();
  user.twoFactor.secretEnc = user.twoFactor.pendingSecretEnc;
  user.twoFactor.pendingSecretEnc = undefined;
  user.twoFactor.recoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);
  await user.save({ validateBeforeSave: false });

  await logAudit(req, { action: "TWO_FACTOR_ENABLED", resourceType: "User", resourceId: user._id, summary: "Two-factor authentication enabled" });
  res.json({ success: true, recoveryCodes, user: publicUser(user) });
});

// POST /api/auth/2fa/recovery-codes (regenerates recovery codes; needs the password and a valid app code)
export const regenerateRecoveryCodes = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(`+password ${TWO_FACTOR_FIELDS}`);
  if (!user.twoFactor?.enabled) throw httpError("Two-factor authentication is not enabled");
  if (!(await bcrypt.compare(String(req.body.password || ""), user.password))) throw httpError("Your password is incorrect", 401);
  if (!verifyTotp(decryptSecret(user.twoFactor.secretEnc), req.body.code)) throw httpError("Invalid verification code", 401);

  const recoveryCodes = generateRecoveryCodes(10);
  user.twoFactor.recoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);
  await user.save({ validateBeforeSave: false });
  await logAudit(req, { action: "RECOVERY_CODES_REGENERATED", resourceType: "User", resourceId: user._id, summary: "Recovery codes regenerated" });
  res.json({ success: true, recoveryCodes });
});

// POST /api/auth/2fa/disable (not available to the Super Admin, whose 2FA is mandatory)
export const disableTwoFactor = asyncHandler(async (req, res) => {
  if (req.user.role === ROLES.SUPER_ADMIN) throw httpError("Two-factor authentication is mandatory for the Super Admin", 403);
  const user = await User.findById(req.user._id).select(`+password ${TWO_FACTOR_FIELDS}`);
  if (!user.twoFactor?.enabled) throw httpError("Two-factor authentication is not enabled");
  if (!(await bcrypt.compare(String(req.body.password || ""), user.password))) throw httpError("Your password is incorrect", 401);
  if (!verifyTotp(decryptSecret(user.twoFactor.secretEnc), req.body.code)) throw httpError("Invalid verification code", 401);

  user.twoFactor = { enabled: false, recoveryCodeHashes: [] };
  await user.save({ validateBeforeSave: false });
  await logAudit(req, { action: "TWO_FACTOR_DISABLED", resourceType: "User", resourceId: user._id, summary: "Two-factor authentication disabled" });
  await notifyUsers([user._id], { type: "security", title: "Two-factor authentication disabled", body: "If this was not you, change your password now." });
  res.json({ success: true, user: publicUser(user) });
});
