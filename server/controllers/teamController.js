import crypto from "crypto";
import User from "../models/User.js";
import Session from "../models/Session.js";
import AuditLog from "../models/AuditLog.js";
import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendEmail, { isEmailConfigured } from "../utils/sendEmail.js";
import { staffInviteEmail } from "../utils/emailTemplates.js";
import { escapeRegex, getPagination, httpError } from "../utils/helpers.js";
import { isOnline } from "../socket/io.js";
import { publicUser } from "../utils/userSerializer.js";
import {
  EMPLOYEE_ROLES, ROLES, canAdminister, canCreateRole, isValidSupervisorRole,
} from "../utils/permissions.js";
import { getDownlineIds } from "../services/hierarchyService.js";
import { revokeAllSessions } from "../services/sessionService.js";
import { logAudit } from "../services/auditService.js";
import { notifyUsers } from "../services/notificationService.js";

const LINK_TTL_MS = 24 * 60 * 60 * 1000;

const clientUrl = () => (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim();

const teamMemberView = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  designation: user.designation,
  avatar: user.avatar?.url || "",
  isBlocked: user.isBlocked,
  suspendedReason: user.suspendedReason,
  mustChangePassword: user.mustChangePassword,
  twoFactorEnabled: Boolean(user.twoFactor?.enabled),
  lastLoginAt: user.lastLoginAt,
  lastSeenAt: user.lastSeenAt || null,
  // True only while this person has a live connection to the server right now.
  online: isOnline(user._id),
  createdAt: user.createdAt,
  reportsTo: user.reportsTo && user.reportsTo.name ? { _id: user.reportsTo._id, name: user.reportsTo.name, role: user.reportsTo.role } : user.reportsTo || null,
});

// Creates a one-time link that lets the person choose their own password. Returns the raw token.
const issueSetupLink = async (user, ttlMs = LINK_TTL_MS) => {
  const token = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
  user.resetPasswordExpire = new Date(Date.now() + ttlMs);
  await user.save({ validateBeforeSave: false });
  return `${clientUrl()}/reset-password/${token}`;
};

// Loads a team member and checks that the actor may administer them.
const loadManageableMember = async (req) => {
  const target = await User.findById(req.params.id);
  if (!target || !EMPLOYEE_ROLES.includes(target.role)) throw httpError("Team member not found", 404);
  const downline = req.user.role === ROLES.SUPER_ADMIN ? [] : await getDownlineIds(req.user._id);
  if (!canAdminister(req.user, target, downline)) throw httpError("You cannot manage this account", 403);
  return { target, downline };
};

// Finds and validates the supervisor a new or moved employee will report to.
const resolveSupervisor = async (actor, role, requestedId, downline) => {
  const supervisorRole = { MANAGER: ROLES.SUPER_ADMIN, ADMIN: ROLES.MANAGER, STAFF: ROLES.ADMIN }[role];
  const supervisorId = role === supervisorRole && actor.role === supervisorRole
    ? actor._id
    : requestedId || (actor.role === supervisorRole ? actor._id : null);
  if (!supervisorId) throw httpError("Choose who this person reports to");

  const supervisor = await User.findById(supervisorId);
  if (!supervisor || supervisor.isBlocked) throw httpError("The selected supervisor is not available");
  if (!isValidSupervisorRole(role, supervisor.role)) {
    throw httpError(`A ${role.toLowerCase()} must report to a ${{ MANAGER: "super admin", ADMIN: "manager", STAFF: "admin" }[role]}`);
  }
  const inScope = actor.role === ROLES.SUPER_ADMIN || String(supervisor._id) === String(actor._id) || downline.includes(String(supervisor._id));
  if (!inScope) throw httpError("You can only assign people inside your own team", 403);
  return supervisor;
};

// GET /api/team ?search=&role=&page=
export const listTeam = asyncHandler(async (req, res) => {
  const { search, role } = req.query;
  const { page, limit, skip } = getPagination(req.query, 15, 50);

  const filter = { role: { $in: EMPLOYEE_ROLES } };
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    filter._id = { $in: await getDownlineIds(req.user._id) };
  }
  if (role && EMPLOYEE_ROLES.includes(role)) filter.role = role;
  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { designation: rx }];
  }

  const [members, total] = await Promise.all([
    User.find(filter).populate("reportsTo", "name role").sort({ role: 1, createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, total, page, pages: Math.ceil(total / limit), members: members.map(teamMemberView) });
});

// GET /api/team/supervisors?role=STAFF lists valid supervisors the actor can pick from.
export const listSupervisors = asyncHandler(async (req, res) => {
  const role = String(req.query.role || "");
  if (!canCreateRole(req.user.role, role)) throw httpError("You cannot create this role", 403);
  const supervisorRole = { MANAGER: ROLES.SUPER_ADMIN, ADMIN: ROLES.MANAGER, STAFF: ROLES.ADMIN }[role];

  const filter = { role: supervisorRole, isBlocked: false };
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    filter._id = { $in: [req.user._id, ...(await getDownlineIds(req.user._id))] };
  }
  const supervisors = await User.find(filter).select("name role designation").sort({ name: 1 });
  res.json({ success: true, supervisors });
});

// POST /api/team (creates an employee and sends or returns a one-time password setup link)
export const createMember = asyncHandler(async (req, res) => {
  const { name, email, phone, role, designation, reportsTo } = req.body;
  if (!canCreateRole(req.user.role, role)) throw httpError("You cannot create this role", 403);
  if (await User.findOne({ email })) throw httpError("An account with this email already exists");

  const downline = req.user.role === ROLES.SUPER_ADMIN ? [] : await getDownlineIds(req.user._id);
  const supervisor = await resolveSupervisor(req.user, role, reportsTo, downline);

  // The account starts with a random password that nobody knows. The person sets their own through the link.
  const member = await User.create({
    name, email, phone, role, designation: designation || "",
    reportsTo: supervisor._id,
    password: crypto.randomBytes(24).toString("hex"),
    mustChangePassword: true,
  });
  const setupUrl = await issueSetupLink(member);

  let emailed = false;
  if (isEmailConfigured()) {
    const settings = await Settings.getSettings();
    const { subject, html } = staffInviteEmail({ user: member, setupUrl, settings, invitedBy: req.user.name });
    emailed = await sendEmail({ to: member.email, subject, html });
  }

  await logAudit(req, {
    action: "TEAM_MEMBER_CREATED", resourceType: "User", resourceId: member._id, targetUser: member._id,
    summary: `Created ${role} account for ${member.email}`, meta: { role, reportsTo: String(supervisor._id) },
  });

  res.status(201).json({
    success: true,
    member: teamMemberView(member),
    emailed,
    // The link is returned only when it could not be emailed, so the creator can share it securely.
    setupUrl: emailed ? undefined : setupUrl,
  });
});

// PUT /api/team/:id (name, phone, designation, reporting line)
export const updateMember = asyncHandler(async (req, res) => {
  const { target, downline } = await loadManageableMember(req);
  const { name, phone, designation, reportsTo } = req.body;
  const changes = {};

  if (name !== undefined && name !== target.name) { changes.name = [target.name, name]; target.name = name; }
  if (phone !== undefined && phone !== target.phone) { changes.phone = [target.phone, phone]; target.phone = phone; }
  if (designation !== undefined && designation !== target.designation) { changes.designation = [target.designation, designation]; target.designation = designation; }
  if (reportsTo && String(reportsTo) !== String(target.reportsTo)) {
    const supervisor = await resolveSupervisor(req.user, target.role, reportsTo, downline);
    if (String(supervisor._id) === String(target._id)) throw httpError("A person cannot report to themselves");
    changes.reportsTo = [String(target.reportsTo), String(supervisor._id)];
    target.reportsTo = supervisor._id;
  }

  await target.save();
  if (Object.keys(changes).length > 0) {
    await logAudit(req, { action: "TEAM_MEMBER_UPDATED", resourceType: "User", resourceId: target._id, targetUser: target._id, summary: `Updated ${Object.keys(changes).join(", ")} for ${target.email}`, meta: { changes } });
  }
  res.json({ success: true, member: teamMemberView(target) });
});

// PUT /api/team/:id/role (Super Admin only, needs password confirmation)
export const changeRole = asyncHandler(async (req, res) => {
  const { target } = await loadManageableMember(req);
  const { role, reportsTo } = req.body;
  if (![ROLES.MANAGER, ROLES.ADMIN, ROLES.STAFF].includes(role)) throw httpError("Choose Manager, Admin or User");
  if (role === target.role) throw httpError("This person already has that role");

  if (await User.exists({ reportsTo: target._id, role: { $in: EMPLOYEE_ROLES } })) {
    throw httpError("Reassign this person's team members before changing their role");
  }
  const downline = await getDownlineIds(req.user._id);
  const supervisor = await resolveSupervisor(req.user, role, reportsTo, downline);

  const previousRole = target.role;
  target.role = role;
  target.reportsTo = supervisor._id;
  await target.save();

  // Permissions changed, so every existing session is closed and the person signs in again.
  await revokeAllSessions(target._id, { reason: "role_changed" });
  await logAudit(req, {
    action: "ROLE_CHANGED", resourceType: "User", resourceId: target._id, targetUser: target._id,
    summary: `Changed ${target.email} from ${previousRole} to ${role}`, meta: { from: previousRole, to: role },
  });
  await notifyUsers([target._id], { type: "account", title: "Your role was changed", body: `You are now ${role}. Please sign in again.` });
  res.json({ success: true, member: teamMemberView(await target.populate("reportsTo", "name role")) });
});

// PUT /api/team/:id/suspend and /reactivate
export const suspendMember = asyncHandler(async (req, res) => {
  const { target } = await loadManageableMember(req);
  target.isBlocked = true;
  target.suspendedReason = String(req.body.reason || "").slice(0, 200);
  await target.save({ validateBeforeSave: false });
  await revokeAllSessions(target._id, { reason: "suspended" });
  await logAudit(req, { action: "ACCOUNT_SUSPENDED", resourceType: "User", resourceId: target._id, targetUser: target._id, summary: `Suspended ${target.email}`, meta: { reason: target.suspendedReason } });
  res.json({ success: true, member: teamMemberView(target) });
});

export const reactivateMember = asyncHandler(async (req, res) => {
  const { target } = await loadManageableMember(req);
  target.isBlocked = false;
  target.suspendedReason = "";
  target.failedLoginCount = 0;
  target.lockUntil = undefined;
  await target.save({ validateBeforeSave: false });
  await logAudit(req, { action: "ACCOUNT_REACTIVATED", resourceType: "User", resourceId: target._id, targetUser: target._id, summary: `Reactivated ${target.email}` });
  res.json({ success: true, member: teamMemberView(target) });
});

// POST /api/team/:id/reset-password (needs password confirmation; issues a one-time link, never a password)
export const resetMemberPassword = asyncHandler(async (req, res) => {
  const { target } = await loadManageableMember(req);

  target.password = crypto.randomBytes(24).toString("hex");
  target.mustChangePassword = true;
  await target.save({ validateBeforeSave: false });
  const setupUrl = await issueSetupLink(target);
  await revokeAllSessions(target._id, { reason: "password_reset_by_admin" });

  let emailed = false;
  if (isEmailConfigured()) {
    const settings = await Settings.getSettings();
    const { subject, html } = staffInviteEmail({ user: target, setupUrl, settings, invitedBy: req.user.name });
    emailed = await sendEmail({ to: target.email, subject, html });
  }
  await logAudit(req, { action: "PASSWORD_RESET_BY_ADMIN", resourceType: "User", resourceId: target._id, targetUser: target._id, summary: `Issued a password reset link for ${target.email}` });
  res.json({ success: true, emailed, setupUrl: emailed ? undefined : setupUrl });
});

// POST /api/team/:id/force-password-change
export const forcePasswordChange = asyncHandler(async (req, res) => {
  const { target } = await loadManageableMember(req);
  target.mustChangePassword = true;
  await target.save({ validateBeforeSave: false });
  await logAudit(req, { action: "FORCE_PASSWORD_CHANGE", resourceType: "User", resourceId: target._id, targetUser: target._id, summary: `Required a password change for ${target.email}` });
  res.json({ success: true, member: teamMemberView(target) });
});

// POST /api/team/:id/revoke-sessions
export const revokeMemberSessions = asyncHandler(async (req, res) => {
  const { target } = await loadManageableMember(req);
  const result = await revokeAllSessions(target._id, { reason: "revoked_by_admin" });
  await logAudit(req, { action: "SESSIONS_REVOKED", resourceType: "User", resourceId: target._id, targetUser: target._id, summary: `Revoked all sessions for ${target.email}` });
  res.json({ success: true, revoked: result.modifiedCount || 0 });
});

// GET /api/team/:id/activity (active sessions plus recent login history and actions)
export const memberActivity = asyncHandler(async (req, res) => {
  const { target } = await loadManageableMember(req);
  const [sessions, history] = await Promise.all([
    Session.find({ user: target._id, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ lastSeenAt: -1 }).select("device ip lastSeenAt createdAt"),
    AuditLog.find({ $or: [{ actor: target._id }, { targetUser: target._id }] }).sort({ createdAt: -1 }).limit(50),
  ]);
  res.json({ success: true, member: publicUser(target), sessions, history });
});
