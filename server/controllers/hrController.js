import Attendance from "../models/Attendance.js";
import LeaveRecord from "../models/LeaveRecord.js";
import SalaryStructure from "../models/SalaryStructure.js";
import PayrollRecord from "../models/PayrollRecord.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError, round2 } from "../utils/helpers.js";
import { calculatePayroll, istDateString, leaveDaysInMonth, workedHours } from "../utils/payroll.js";
import { EMPLOYEE_ROLES, ROLES } from "../utils/permissions.js";
import { getDownlineIds } from "../services/hierarchyService.js";
import { notifyUsers } from "../services/notificationService.js";
import { logAudit } from "../services/auditService.js";

const MONTH_RX = /^\d{4}-(0[1-9]|1[0-2])$/;
const currentMonth = () => istDateString().slice(0, 7);
const monthOf = (value) => {
  const month = value || currentMonth();
  if (!MONTH_RX.test(month)) throw httpError("Month must look like 2026-10");
  return month;
};

// Employees whose attendance or leave the caller may see: everyone for the Super Admin, otherwise their own team.
const teamScope = async (actor) => {
  if (actor.role === ROLES.SUPER_ADMIN) return null;
  return getDownlineIds(actor._id);
};

const summarise = (rows) => ({
  days: rows.filter((r) => r.checkOut).length,
  hours: round2(rows.reduce((sum, r) => sum + workedHours(r.checkIn, r.checkOut), 0)),
});

// ---------- Attendance ----------

export const checkIn = asyncHandler(async (req, res) => {
  const date = istDateString();
  try {
    const record = await Attendance.create({ user: req.user._id, date, checkIn: new Date() });
    res.status(201).json({ success: true, record });
  } catch (error) {
    if (error.code === 11000) throw httpError("You have already checked in today");
    throw error;
  }
});

export const checkOut = asyncHandler(async (req, res) => {
  const record = await Attendance.findOne({ user: req.user._id, date: istDateString() });
  if (!record) throw httpError("Check in first");
  if (record.checkOut) throw httpError("You have already checked out today");
  record.checkOut = new Date();
  if (req.body.note) record.note = String(req.body.note).slice(0, 200);
  await record.save();
  res.json({ success: true, record });
});

// GET /api/hr/attendance/me?month=2026-10
export const myAttendance = asyncHandler(async (req, res) => {
  const month = monthOf(req.query.month);
  const records = await Attendance.find({ user: req.user._id, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).sort({ date: -1 });
  const today = records.find((r) => r.date === istDateString()) || null;
  res.json({ success: true, month, today, records, summary: summarise(records) });
});

// GET /api/hr/attendance/team?month=&user=
export const teamAttendance = asyncHandler(async (req, res) => {
  const month = monthOf(req.query.month);
  const scope = await teamScope(req.user);
  const filter = { date: { $gte: `${month}-01`, $lte: `${month}-31` } };
  if (scope) filter.user = { $in: scope };
  if (req.query.user) {
    if (scope && !scope.includes(req.query.user)) throw httpError("This employee is not on your team", 403);
    filter.user = req.query.user;
  }
  const records = await Attendance.find(filter).populate("user", "name role").sort({ date: -1 }).limit(500);
  res.json({ success: true, month, records });
});

// ---------- Leave ----------

export const requestLeave = asyncHandler(async (req, res) => {
  const { from, to, type, reason } = req.body;
  if (to < from) throw httpError("The end date cannot be before the start date");
  const leave = await LeaveRecord.create({ user: req.user._id, from, to, type, reason });
  if (req.user.reportsTo) {
    await notifyUsers([req.user.reportsTo], { type: "leave", title: `Leave request from ${req.user.name}`, body: `${from} to ${to}`, link: "/admin/attendance" });
  }
  res.status(201).json({ success: true, leave });
});

export const myLeaves = asyncHandler(async (req, res) => {
  res.json({ success: true, leaves: await LeaveRecord.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50) });
});

export const teamLeaves = asyncHandler(async (req, res) => {
  const scope = await teamScope(req.user);
  const filter = scope ? { user: { $in: scope } } : {};
  if (req.query.status) filter.status = req.query.status;
  res.json({ success: true, leaves: await LeaveRecord.find(filter).populate("user", "name role").sort({ createdAt: -1 }).limit(100) });
});

export const decideLeave = asyncHandler(async (req, res) => {
  const leave = await LeaveRecord.findById(req.params.id);
  if (!leave) throw httpError("Leave request not found", 404);
  if (String(leave.user) === String(req.user._id)) throw httpError("You cannot decide your own leave", 403);
  const scope = await teamScope(req.user);
  if (scope && !scope.includes(String(leave.user))) throw httpError("This employee is not on your team", 403);
  if (leave.status !== "pending") throw httpError(`This request is already ${leave.status}`);
  leave.status = req.body.decision === "approve" ? "approved" : "rejected";
  leave.decidedBy = req.user._id;
  leave.decidedAt = new Date();
  await leave.save();
  await notifyUsers([leave.user], { type: "leave", title: `Your leave was ${leave.status}`, body: `${leave.from} to ${leave.to}`, link: "/admin/attendance" });
  await logAudit(req, { action: "LEAVE_DECIDED", resourceType: "LeaveRecord", resourceId: leave._id, targetUser: leave.user, summary: `Leave ${leave.status}` });
  res.json({ success: true, leave });
});

// ---------- Salary and payroll (Super Admin) ----------

export const listStructures = asyncHandler(async (req, res) => {
  const [employees, structures] = await Promise.all([
    User.find({ role: { $in: EMPLOYEE_ROLES } }).select("name role designation email").sort({ name: 1 }).lean(),
    SalaryStructure.find().lean(),
  ]);
  const byUser = new Map(structures.map((s) => [String(s.user), s]));
  res.json({ success: true, employees: employees.map((e) => ({ ...e, structure: byUser.get(String(e._id)) || null })) });
});

export const saveStructure = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.userId, role: { $in: EMPLOYEE_ROLES } });
  if (!user) throw httpError("Employee not found", 404);
  const { monthlyBase, workingDays, dailyHours, overtimeMultiplier } = req.body;
  const structure = await SalaryStructure.findOneAndUpdate(
    { user: user._id },
    { monthlyBase, ...(workingDays && { workingDays }), ...(dailyHours && { dailyHours }), ...(overtimeMultiplier && { overtimeMultiplier }) },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  );
  await logAudit(req, { action: "SALARY_STRUCTURE_SAVED", resourceType: "SalaryStructure", resourceId: structure._id, targetUser: user._id, summary: `Updated salary terms for ${user.name}` });
  res.json({ success: true, structure });
});

const buildPayroll = async (structure, month, extras = {}) => {
  const [year, mm] = month.split("-").map(Number);
  const [records, leaves] = await Promise.all([
    Attendance.find({ user: structure.user, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).lean(),
    LeaveRecord.find({ user: structure.user, status: "approved", type: "unpaid" }).lean(),
  ]);
  const unpaidLeaveDays = leaves.reduce((sum, l) => sum + leaveDaysInMonth(l.from, l.to, year, mm), 0);
  const result = calculatePayroll(structure, records, { unpaidLeaveDays, bonuses: extras.bonuses, deductions: extras.otherDeductions });
  return { ...result, unpaidLeaveDays };
};

// POST /api/hr/payroll/generate  { month }  creates or refreshes draft payroll for everyone with a salary structure
export const generatePayroll = asyncHandler(async (req, res) => {
  const month = monthOf(req.body.month);
  const structures = await SalaryStructure.find().lean();
  let created = 0;
  let refreshed = 0;
  for (const structure of structures) {
    const existing = await PayrollRecord.findOne({ user: structure.user, month });
    if (existing?.status === "paid") continue; // paid payroll is final
    const calc = await buildPayroll(structure, month, { bonuses: existing?.bonuses, otherDeductions: existing?.otherDeductions });
    await PayrollRecord.findOneAndUpdate({ user: structure.user, month }, { ...calc, generatedBy: req.user._id }, { upsert: true, setDefaultsOnInsert: true });
    if (existing) refreshed += 1; else created += 1;
  }
  await logAudit(req, { action: "PAYROLL_GENERATED", resourceType: "PayrollRecord", summary: `Payroll for ${month}: ${created} created, ${refreshed} refreshed` });
  res.json({ success: true, month, created, refreshed });
});

export const listPayroll = asyncHandler(async (req, res) => {
  const month = monthOf(req.query.month);
  const records = await PayrollRecord.find({ month }).populate("user", "name role designation").sort({ createdAt: 1 });
  const total = (key) => round2(records.reduce((s, r) => s + (r[key] || 0), 0));
  res.json({ success: true, month, records, totals: { grossPay: total("grossPay"), netPay: total("netPay"), bonuses: total("bonuses"), overtimePay: total("overtimePay") } });
});

// PUT /api/hr/payroll/:id  { bonuses, otherDeductions, note }  recalculates a draft
export const adjustPayroll = asyncHandler(async (req, res) => {
  const record = await PayrollRecord.findById(req.params.id);
  if (!record) throw httpError("Payroll record not found", 404);
  if (record.status === "paid") throw httpError("Paid payroll cannot be changed");
  const structure = await SalaryStructure.findOne({ user: record.user }).lean();
  if (!structure) throw httpError("Salary structure is missing");
  const bonuses = Number(req.body.bonuses ?? record.bonuses) || 0;
  const otherDeductions = Number(req.body.otherDeductions ?? record.otherDeductions) || 0;
  Object.assign(record, await buildPayroll(structure, record.month, { bonuses, otherDeductions }));
  if (req.body.note !== undefined) record.note = String(req.body.note).slice(0, 200);
  await record.save();
  res.json({ success: true, record });
});

export const payPayroll = asyncHandler(async (req, res) => {
  const record = await PayrollRecord.findById(req.params.id);
  if (!record) throw httpError("Payroll record not found", 404);
  if (record.status === "paid") throw httpError("Already paid");
  record.status = "paid";
  record.paidAt = new Date();
  await record.save();
  await notifyUsers([record.user], { type: "payroll", title: `Salary for ${record.month} paid`, body: "Open your payslip", link: "/admin/attendance" });
  await logAudit(req, { action: "PAYROLL_PAID", resourceType: "PayrollRecord", resourceId: record._id, targetUser: record.user, summary: `Paid ${record.month} salary` });
  res.json({ success: true, record });
});

// GET /api/hr/payroll/me  an employee sees only their own payslips
export const myPayslips = asyncHandler(async (req, res) => {
  const records = await PayrollRecord.find({ user: req.user._id, status: "paid" }).sort({ month: -1 }).limit(24);
  res.json({ success: true, records });
});
