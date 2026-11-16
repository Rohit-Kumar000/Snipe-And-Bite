import Expense, { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../models/Expense.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError, getPagination, round2, escapeRegex } from "../utils/helpers.js";
import { logAudit } from "../services/auditService.js";

// Turns ?from=&to= (YYYY-MM-DD, India time) into a createdAt style range. `to` is inclusive.
export const dateRange = (from, to) => {
  const range = {};
  if (from && !Number.isNaN(Date.parse(`${from}T00:00:00+05:30`))) range.$gte = new Date(`${from}T00:00:00+05:30`);
  if (to && !Number.isNaN(Date.parse(`${to}T00:00:00+05:30`))) range.$lt = new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 864e5);
  return Object.keys(range).length ? range : null;
};

// GET /api/expenses?category=&from=&to=&search=&page=
export const listExpenses = asyncHandler(async (req, res) => {
  const { category, from, to, search, method } = req.query;
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const filter = {};
  if (category) filter.category = category;
  if (method) filter.paymentMethod = method;
  const range = dateRange(from, to);
  if (range) filter.date = range;
  if (search && String(search).trim()) filter.title = new RegExp(escapeRegex(String(search).trim()), "i");

  const [expenses, total, byCategory] = await Promise.all([
    Expense.find(filter).populate("createdBy", "name").sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
    Expense.countDocuments(filter),
    Expense.aggregate([{ $match: filter }, { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
  ]);
  res.json({
    success: true, total, page, pages: Math.ceil(total / limit), expenses,
    summary: { total: round2(byCategory.reduce((s, r) => s + r.total, 0)), byCategory: byCategory.map((r) => ({ category: r._id, total: round2(r.total), count: r.count })) },
    categories: EXPENSE_CATEGORIES, methods: PAYMENT_METHODS,
  });
});

export const createExpense = asyncHandler(async (req, res) => {
  const { title, category, amount, date, paymentMethod, note } = req.body;
  const expense = await Expense.create({ title, category, amount, date, paymentMethod, note, createdBy: req.user._id });
  await logAudit(req, { action: "EXPENSE_CREATED", resourceType: "Expense", resourceId: expense._id, summary: `${title}: Rs. ${amount}`, meta: { category } });
  res.status(201).json({ success: true, expense });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw httpError("Expense not found", 404);
  for (const key of ["title", "category", "amount", "date", "paymentMethod", "note"]) {
    if (req.body[key] !== undefined) expense[key] = req.body[key];
  }
  await expense.save();
  await logAudit(req, { action: "EXPENSE_UPDATED", resourceType: "Expense", resourceId: expense._id, summary: `Updated expense ${expense.title}` });
  res.json({ success: true, expense });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw httpError("Expense not found", 404);
  await expense.deleteOne();
  await logAudit(req, { action: "EXPENSE_DELETED", resourceType: "Expense", resourceId: expense._id, summary: `Deleted expense ${expense.title} (Rs. ${expense.amount})` });
  res.json({ success: true });
});
