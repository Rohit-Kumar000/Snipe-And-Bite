import Order, { ADMIN_VISIBLE_FILTER } from "../models/Order.js";
import User from "../models/User.js";
import MenuItem from "../models/MenuItem.js";
import Reservation from "../models/Reservation.js";
import asyncHandler from "../utils/asyncHandler.js";
import Expense from "../models/Expense.js";
import StockItem from "../models/StockItem.js";
import AuditLog from "../models/AuditLog.js";
import { hasPermission } from "../utils/permissions.js";
import { profitAndLoss } from "../utils/finance.js";
import { startOfTodayIST, round2 } from "../utils/helpers.js";

// Orders that count as sales: visible to admin and not cancelled.
const SALES_MATCH = { $and: [ADMIN_VISIBLE_FILTER, { status: { $ne: "cancelled" } }] };

const sumRevenue = async (extra = {}) => {
  const [row] = await Order.aggregate([
    { $match: { $and: [SALES_MATCH, extra] } },
    { $group: { _id: null, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
  ]);
  return { revenue: round2(row?.revenue || 0), orders: row?.orders || 0 };
};

// GET /api/dashboard/stats
export const getStats = asyncHandler(async (req, res) => {
  const todayStart = startOfTodayIST();

  const [today, overall, activeOrders, customers, menuItems, pendingReservations, statusRows] =
    await Promise.all([
      sumRevenue({ createdAt: { $gte: todayStart } }),
      sumRevenue(),
      Order.countDocuments({
        $and: [ADMIN_VISIBLE_FILTER, { status: { $in: ["placed", "confirmed", "preparing", "ready", "out_for_delivery"] } }],
      }),
      User.countDocuments({ role: "CUSTOMER" }),
      MenuItem.countDocuments({ isAvailable: true }),
      Reservation.countDocuments({ status: "pending", dateTime: { $gte: new Date() } }),
      Order.aggregate([{ $match: ADMIN_VISIBLE_FILTER }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

  // Money figures and activity are shared only with roles that hold the matching permission.
  const extra = {};
  if (hasPermission(req.user.role, "reports.view")) {
    const monthStart = new Date(`${new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 7)}-01T00:00:00+05:30`);
    const [month, expenseRow, activity] = await Promise.all([
      sumRevenue({ createdAt: { $gte: monthStart } }),
      Expense.aggregate([{ $match: { date: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      AuditLog.find().sort({ createdAt: -1 }).limit(8).select("actorName actorRole action summary createdAt").lean(),
    ]);
    const pnl = profitAndLoss({ revenue: month.revenue, expenses: expenseRow[0]?.total || 0 });
    extra.finance = { monthRevenue: pnl.revenue, monthExpenses: pnl.expenses, monthProfit: pnl.netProfit };
    extra.recentActivity = activity;
  }
  if (hasPermission(req.user.role, "inventory.view")) {
    extra.lowStockItems = await StockItem.find({ isActive: true, $expr: { $lte: ["$quantity", "$reorderLevel"] } }).sort({ quantity: 1 }).limit(6).select("name quantity unit reorderLevel").lean();
  }

  res.json({
    success: true,
    ...extra,
    stats: {
      todayOrders: today.orders,
      todayRevenue: today.revenue,
      totalOrders: overall.orders,
      totalRevenue: overall.revenue,
      activeOrders,
      customers,
      availableItems: menuItems,
      pendingReservations,
      statusBreakdown: Object.fromEntries(statusRows.map((r) => [r._id, r.count])),
    },
  });
});

// GET /api/dashboard/sales-chart?days=7
export const getSalesChart = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);
  const todayStart = startOfTodayIST();
  const from = new Date(todayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  const rows = await Order.aggregate([
    { $match: { $and: [SALES_MATCH, { createdAt: { $gte: from } }] } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
        orders: { $sum: 1 },
        revenue: { $sum: "$totalAmount" },
      },
    },
  ]);
  const byDate = new Map(rows.map((r) => [r._id, r]));

  // Days without orders are included with zero values so the chart has no gaps.
  const chart = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(from.getTime() + i * 24 * 60 * 60 * 1000 + 5.5 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    const row = byDate.get(key);
    chart.push({ date: key, orders: row?.orders || 0, revenue: round2(row?.revenue || 0) });
  }

  res.json({ success: true, chart });
});

// GET /api/dashboard/top-items?limit=5
export const getTopItems = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 5, 1), 20);

  const items = await Order.aggregate([
    { $match: SALES_MATCH },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.name",
        qty: { $sum: "$items.qty" },
        revenue: { $sum: "$items.lineTotal" },
      },
    },
    { $sort: { qty: -1 } },
    { $limit: limit },
    { $project: { _id: 0, name: "$_id", qty: 1, revenue: 1 } },
  ]);

  res.json({ success: true, items });
});
