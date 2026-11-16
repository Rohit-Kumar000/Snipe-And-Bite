import AuditLog from "../models/AuditLog.js";
import asyncHandler from "../utils/asyncHandler.js";
import { escapeRegex, getPagination } from "../utils/helpers.js";
import { buildAuditScope, ROLES } from "../utils/permissions.js";
import { getDownlineIds } from "../services/hierarchyService.js";

// GET /api/audit-logs ?action=&actor=&q=&from=&to=&page=
// Each role only sees the activity it is allowed to see (see buildAuditScope).
export const listAuditLogs = asyncHandler(async (req, res) => {
  const { action, actor, q, from, to } = req.query;
  const { page, limit, skip } = getPagination(req.query, 25, 100);

  const downline = req.user.role === ROLES.SUPER_ADMIN ? [] : await getDownlineIds(req.user._id);
  const conditions = [buildAuditScope(req.user, downline)];

  if (action) conditions.push({ action: String(action) });
  if (actor) {
    const allowed = req.user.role === ROLES.SUPER_ADMIN || [String(req.user._id), ...downline].includes(String(actor));
    conditions.push({ actor: allowed ? String(actor) : null });
  }
  if (q && String(q).trim()) conditions.push({ summary: new RegExp(escapeRegex(String(q).trim()), "i") });
  const range = {};
  if (from && !Number.isNaN(new Date(from).getTime())) range.$gte = new Date(from);
  if (to && !Number.isNaN(new Date(to).getTime())) range.$lte = new Date(to);
  if (Object.keys(range).length > 0) conditions.push({ createdAt: range });

  const filter = { $and: conditions };
  const [logs, total, actions] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
    AuditLog.distinct("action", conditions[0]),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), logs, actions: actions.sort() });
});
