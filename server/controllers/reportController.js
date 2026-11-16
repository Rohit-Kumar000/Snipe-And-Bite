import PDFDocument from "pdfkit";
import Order, { ADMIN_VISIBLE_FILTER } from "../models/Order.js";
import Expense from "../models/Expense.js";
import StockItem from "../models/StockItem.js";
import MenuItem from "../models/MenuItem.js";
import PayrollRecord from "../models/PayrollRecord.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError, round2 } from "../utils/helpers.js";
import { profitAndLoss, inventoryValuation, menuItemUnitCost } from "../utils/finance.js";
import { toCsv } from "../utils/csv.js";
import { hasPermission } from "../utils/permissions.js";
import { dateRange } from "./expenseController.js";
import { logAudit } from "../services/auditService.js";

const SALES = { $and: [ADMIN_VISIBLE_FILTER, { status: { $ne: "cancelled" } }] };

// Default window is the current month in India time.
const resolveRange = (query) => {
  let { from, to } = query;
  if (!from || !to) {
    const today = new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
    from = from || `${today.slice(0, 8)}01`;
    to = to || today;
  }
  const range = dateRange(from, to);
  if (!range) throw httpError("Enter valid from and to dates");
  return { from, to, range };
};
const monthsBetween = (from, to) => {
  const out = [];
  const end = to.slice(0, 7);
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  while (`${y}-${String(m).padStart(2, "0")}` <= end && out.length < 36) { out.push(`${y}-${String(m).padStart(2, "0")}`); m += 1; if (m > 12) { m = 1; y += 1; } }
  return out;
};

const unitCostMap = async () => new Map((await StockItem.find().select("unitCost").lean()).map((s) => [String(s._id), s.unitCost]));

// Revenue, refunds and cost of goods sold from real orders in the range.
const salesFigures = async (range) => {
  const match = { $and: [SALES, { createdAt: range }] };
  const [totals] = await Order.aggregate([{ $match: match }, { $group: { _id: null, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } }]);
  const [refunds] = await Order.aggregate([{ $match: { createdAt: range, paymentStatus: { $in: ["refund_pending", "refunded"] } } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]);
  const sold = await Order.aggregate([{ $match: match }, { $unwind: "$items" }, { $match: { "items.kind": "menu" } }, { $group: { _id: "$items.menuItem", name: { $first: "$items.name" }, qty: { $sum: "$items.qty" }, revenue: { $sum: "$items.lineTotal" } } }]);
  const [menu, costs] = await Promise.all([MenuItem.find({ _id: { $in: sold.map((s) => s._id) } }).select("costing").lean(), unitCostMap()]);
  const costOf = new Map(menu.map((m) => [String(m._id), menuItemUnitCost(m.costing, costs)]));
  const products = sold.map((s) => {
    const unitCost = costOf.get(String(s._id)) || 0;
    const cost = round2(unitCost * s.qty);
    const profit = round2(s.revenue - cost);
    return { product: s.name, quantity: s.qty, revenue: round2(s.revenue), unitCost, totalCost: cost, profit, marginPct: s.revenue > 0 ? round2((profit / s.revenue) * 100) : 0 };
  }).sort((a, b) => b.profit - a.profit);
  return { revenue: totals?.revenue || 0, orders: totals?.orders || 0, refunds: refunds?.total || 0, cogs: round2(products.reduce((s, p) => s + p.totalCost, 0)), products };
};

const expenseTotal = async (range) => {
  const [row] = await Expense.aggregate([{ $match: { date: range } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  return row?.total || 0;
};
const payrollTotal = async (from, to) => {
  const [row] = await PayrollRecord.aggregate([{ $match: { month: { $in: monthsBetween(from, to) }, status: "paid" } }, { $group: { _id: null, total: { $sum: "$netPay" } } }]);
  return row?.total || 0;
};

// Builds every report as { title, columns, rows, totals? } so JSON, CSV and PDF share one source.
const buildReport = async (type, query, actor) => {
  const { from, to, range } = resolveRange(query);
  const canSeePayroll = hasPermission(actor.role, "payroll.manage");

  if (type === "summary") {
    const sales = await salesFigures(range);
    const [expenses, payroll, stock] = await Promise.all([expenseTotal(range), canSeePayroll ? payrollTotal(from, to) : 0, StockItem.find({ isActive: true }).select("quantity unitCost").lean()]);
    return { type, from, to, orders: sales.orders, payrollIncluded: canSeePayroll, pnl: profitAndLoss({ revenue: sales.revenue, refunds: sales.refunds, cogs: sales.cogs, expenses, payroll }), inventoryValue: inventoryValuation(stock) };
  }

  if (type === "revenue") {
    const rows = await Order.aggregate([
      { $match: { $and: [SALES, { createdAt: range }] } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, orders: { $sum: 1 }, revenue: { $sum: "$totalAmount" }, discount: { $sum: "$discount" }, delivery: { $sum: "$deliveryCharge" }, tax: { $sum: "$tax" } } },
      { $sort: { _id: 1 } },
    ]);
    return { type, title: "Revenue report", from, to, columns: [{ key: "date", label: "Date" }, { key: "orders", label: "Orders" }, { key: "revenue", label: "Revenue (₹)" }, { key: "discount", label: "Discounts (₹)" }, { key: "delivery", label: "Delivery (₹)" }, { key: "tax", label: "Tax (₹)" }], rows: rows.map((r) => ({ date: r._id, orders: r.orders, revenue: round2(r.revenue), discount: round2(r.discount), delivery: round2(r.delivery), tax: round2(r.tax) })) };
  }

  if (type === "expenses") {
    const rows = await Expense.find({ date: range }).populate("createdBy", "name").sort({ date: 1 }).lean();
    return { type, title: "Expense report", from, to, columns: [{ key: "date", label: "Date" }, { key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "paymentMethod", label: "Payment method" }, { key: "amount", label: "Amount (₹)" }, { key: "by", label: "Recorded by" }], rows: rows.map((e) => ({ date: e.date.toISOString().slice(0, 10), title: e.title, category: e.category, paymentMethod: e.paymentMethod, amount: round2(e.amount), by: e.createdBy?.name || "" })) };
  }

  if (type === "profit-loss") {
    const s = await buildReport("summary", query, actor);
    const p = s.pnl;
    const rows = [["Revenue", p.revenue], ["Refunds", -p.refunds], ["Net revenue", p.netRevenue], ["Cost of goods sold", -p.cogs], ["Gross profit", p.grossProfit], ["Operating expenses", -p.expenses], ...(canSeePayroll ? [["Payroll", -p.payroll]] : []), ["Net profit", p.netProfit], ["Net margin (%)", p.netMarginPct]].map(([line, amount]) => ({ line, amount }));
    return { type, title: "Profit and loss", from, to, columns: [{ key: "line", label: "Line" }, { key: "amount", label: "Amount (₹)" }], rows };
  }

  if (type === "products") {
    const sales = await salesFigures(range);
    return { type, title: "Product profitability", from, to, columns: [{ key: "product", label: "Product" }, { key: "quantity", label: "Qty sold" }, { key: "revenue", label: "Revenue (₹)" }, { key: "unitCost", label: "Unit cost (₹)" }, { key: "totalCost", label: "Total cost (₹)" }, { key: "profit", label: "Profit (₹)" }, { key: "marginPct", label: "Margin (%)" }], rows: sales.products };
  }

  if (type === "inventory") {
    const items = await StockItem.find({ isActive: true }).sort({ name: 1 }).lean();
    return { type, title: "Inventory valuation", from, to, columns: [{ key: "name", label: "Item" }, { key: "category", label: "Category" }, { key: "quantity", label: "Quantity" }, { key: "unit", label: "Unit" }, { key: "unitCost", label: "Unit cost (₹)" }, { key: "value", label: "Value (₹)" }, { key: "low", label: "Low stock" }], rows: items.map((i) => ({ name: i.name, category: i.category, quantity: round2(i.quantity), unit: i.unit, unitCost: i.unitCost, value: round2(i.quantity * i.unitCost), low: i.quantity <= i.reorderLevel ? "Yes" : "No" })) };
  }

  if (type === "payroll") {
    if (!canSeePayroll) throw httpError("You do not have permission to view payroll reports", 403);
    const rows = await PayrollRecord.find({ month: { $in: monthsBetween(from, to) } }).populate("user", "name role").sort({ month: 1 }).lean();
    return { type, title: "Payroll report", from, to, columns: [{ key: "month", label: "Month" }, { key: "name", label: "Employee" }, { key: "role", label: "Role" }, { key: "baseSalary", label: "Base (₹)" }, { key: "overtimePay", label: "Overtime (₹)" }, { key: "bonuses", label: "Bonus (₹)" }, { key: "deductions", label: "Deductions (₹)" }, { key: "netPay", label: "Net pay (₹)" }, { key: "status", label: "Status" }], rows: rows.map((r) => ({ month: r.month, name: r.user?.name, role: r.user?.role, baseSalary: r.baseSalary, overtimePay: r.overtimePay, bonuses: r.bonuses, deductions: round2((r.unpaidLeaveDeduction || 0) + (r.otherDeductions || 0)), netPay: r.netPay, status: r.status })) };
  }

  throw httpError("Unknown report", 404);
};

const writePdf = (res, report) => {
  const doc = new PDFDocument({ margin: 36, size: "A4", layout: report.columns.length > 5 ? "landscape" : "portrait" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${report.type}-${report.from}-to-${report.to}.pdf"`);
  doc.pipe(res);
  doc.fontSize(18).text("Snipe&Bite", { continued: true }).fontSize(12).text(`   ${report.title}`);
  doc.fontSize(9).fillColor("#555").text(`${report.from} to ${report.to}  |  Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`).moveDown();
  const width = (doc.page.width - 72) / report.columns.length;
  const row = (cells, bold) => {
    if (doc.y > doc.page.height - 60) doc.addPage();
    const y = doc.y;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor("#111");
    cells.forEach((cell, i) => doc.text(String(cell ?? "").replace(/₹/g, "Rs."), 36 + i * width, y, { width: width - 4, ellipsis: true, lineBreak: false }));
    doc.y = y + 14;
  };
  row(report.columns.map((c) => c.label), true);
  report.rows.forEach((r) => row(report.columns.map((c) => r[c.key]), false));
  if (report.rows.length === 0) doc.moveDown().fontSize(10).text("No records for this period.");
  doc.end();
};

// GET /api/reports/:type?from=&to=&format=json|csv|pdf
export const getReport = asyncHandler(async (req, res) => {
  const report = await buildReport(req.params.type, req.query, req.user);
  const { format } = req.query;
  if (report.type === "summary" || !format || format === "json") return res.json({ success: true, report });
  await logAudit(req, { action: "REPORT_EXPORTED", resourceType: "Report", summary: `Exported ${report.type} as ${format}`, meta: { from: report.from, to: report.to } });
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${report.type}-${report.from}-to-${report.to}.csv"`);
    return res.send(toCsv(report.columns, report.rows));
  }
  if (format === "pdf") return writePdf(res, report);
  throw httpError("Format must be json, csv or pdf");
});
