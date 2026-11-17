import test from "node:test";
import assert from "node:assert/strict";
import { ROLES, hasPermission } from "../utils/permissions.js";
import { canChatWith, canMonitorConversation, canMonitorChats, pairKey, canDeleteChatMessage, sanitizeMessageText, allowedContactIds } from "../utils/chatPolicy.js";
import { productCost, profitability, profitAndLoss, inventoryValuation, weightedAverageCost, menuItemUnitCost } from "../utils/finance.js";
import { calculatePayroll, workedHours, leaveDaysInMonth, istDateString } from "../utils/payroll.js";
import { toCsv, csvCell } from "../utils/csv.js";

const u = (id, role, extra = {}) => ({ _id: id, role, isBlocked: false, ...extra });

test("only the Super Admin holds chat.delete and payroll.manage", () => {
  for (const role of [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER]) {
    assert.equal(hasPermission(role, "chat.delete"), false, role);
    assert.equal(hasPermission(role, "payroll.manage"), false, role);
  }
  assert.equal(hasPermission(ROLES.SUPER_ADMIN, "chat.delete"), true);
  assert.equal(canDeleteChatMessage(u("1", ROLES.ADMIN)), false);
  assert.equal(canDeleteChatMessage(u("1", ROLES.SUPER_ADMIN)), true);
});

test("customers hold no chat, inventory, finance or payroll permission", () => {
  for (const p of ["chat.use", "inventory.view", "expenses.manage", "reports.view", "payroll.viewOwn", "attendance.self"]) {
    assert.equal(hasPermission(ROLES.CUSTOMER, p), false, p);
  }
});

test("staff cannot see costing, expenses or reports", () => {
  for (const p of ["costing.view", "expenses.manage", "reports.view", "payroll.manage", "attendance.viewTeam"]) {
    assert.equal(hasPermission(ROLES.STAFF, p), false, p);
  }
});

test("chat follows the role rules", () => {
  const sa = u("sa", ROLES.SUPER_ADMIN);
  const admin = u("ad", ROLES.ADMIN);
  const mgr = u("mg", ROLES.MANAGER);
  const staff1 = u("s1", ROLES.STAFF);
  const staff2 = u("s2", ROLES.STAFF);

  // Super Admin can reach every employee.
  for (const t of [admin, mgr, staff1]) assert.equal(canChatWith(sa, t), true, `SA to ${t.role}`);
  for (const t of [sa, mgr, staff1]) assert.equal(canChatWith(admin, t), true, `Admin to ${t.role}`);
  // Manager reaches Admin, User and Super Admin.
  for (const t of [sa, admin, staff1]) assert.equal(canChatWith(mgr, t), true, `Manager to ${t.role}`);
  // User accounts can read incoming messages but cannot send.
  assert.equal(canChatWith(staff1, mgr), false);
  assert.equal(canChatWith(staff1, mgr, true), true);
  assert.equal(canChatWith(staff1, admin), false, "users cannot start a chat with an Admin");
  assert.equal(canChatWith(staff1, sa, true), true, "users can read a Super Admin message");
  assert.equal(canChatWith(staff1, staff2), false, "peers cannot chat");
  assert.equal(canChatWith(admin, u("ad2", ROLES.ADMIN)), false, "same role cannot chat");
  assert.equal(canChatWith(staff1, staff1), false, "no chat with yourself");
});

test("users may read an Admin or Super Admin message but do not start chats", () => {
  const sa = u("sa", ROLES.SUPER_ADMIN);
  const admin = u("ad", ROLES.ADMIN);
  const staff = u("s1", ROLES.STAFF);
  assert.equal(canChatWith(staff, admin, true), true);
  assert.equal(canChatWith(staff, sa, true), true);
  assert.equal(canChatWith(staff, admin, false), false);
});

test("only the Super Admin can inspect other conversations", () => {
  const sa = u("sa", ROLES.SUPER_ADMIN);
  const admin = u("ad", ROLES.ADMIN);
  const mgr = u("mg", ROLES.MANAGER);
  const staff = u("s1", ROLES.STAFF);
  assert.equal(canMonitorConversation(sa, mgr, staff), true);
  assert.equal(canMonitorConversation(sa, admin, mgr), true);
  assert.equal(canMonitorConversation(admin, mgr, staff), false, "only the Super Admin can inspect another conversation");
  assert.equal(canMonitorConversation(admin, sa, mgr), false, "Admin cannot read a Super Admin conversation");
  assert.equal(canMonitorConversation(mgr, admin, staff), false);
  assert.equal(canMonitorConversation(staff, mgr, admin), false);
  assert.equal(canMonitorChats(ROLES.ADMIN), false);
  assert.equal(canMonitorChats(ROLES.MANAGER), false);
});

test("chat rejects customers and suspended accounts", () => {
  const sa = u("sa", ROLES.SUPER_ADMIN);
  assert.equal(canChatWith(sa, u("c", ROLES.CUSTOMER)), false);
  assert.equal(canChatWith(sa, u("s", ROLES.STAFF, { isBlocked: true })), false);
});

test("pairKey is order independent and message text is bounded", () => {
  assert.equal(pairKey("b", "a"), pairKey("a", "b"));
  assert.equal(sanitizeMessageText("  hi\u0000  "), "hi");
  assert.equal(sanitizeMessageText("x".repeat(5000)).length, 2000);
  assert.equal(sanitizeMessageText(null), "");
});

test("product cost and profitability use the recorded numbers", () => {
  const cost = productCost({
    ingredients: [{ qty: 0.2, unitCost: 100 }, { qty: 2, unitCost: 5.5 }],
    packagingCost: 8,
    extraCost: 2,
  });
  assert.equal(cost, 41);
  const p = profitability(120, cost);
  assert.equal(p.grossProfit, 79);
  assert.equal(p.marginPct, 65.83);
});

test("profitability never divides by zero and ignores bad numbers", () => {
  assert.equal(profitability(0, 10).marginPct, 0);
  assert.equal(productCost({ ingredients: [{ qty: "abc", unitCost: 5 }], packagingCost: -3 }), 0);
});

test("profit and loss adds up", () => {
  const pl = profitAndLoss({ revenue: 100000, refunds: 5000, cogs: 40000, expenses: 20000, payroll: 15000 });
  assert.equal(pl.netRevenue, 95000);
  assert.equal(pl.grossProfit, 55000);
  assert.equal(pl.netProfit, 20000);
  assert.equal(pl.netMarginPct, 21.05);
});

test("inventory valuation multiplies quantity by unit cost", () => {
  assert.equal(inventoryValuation([{ quantity: 10, unitCost: 12.5 }, { quantity: 3, unitCost: 100 }]), 425);
  assert.equal(inventoryValuation([]), 0);
});

test("worked hours handles open and reversed records", () => {
  assert.equal(workedHours("2026-10-01T09:00:00Z", "2026-10-01T17:30:00Z"), 8.5);
  assert.equal(workedHours("2026-10-01T09:00:00Z", null), 0);
  assert.equal(workedHours("2026-10-01T17:00:00Z", "2026-10-01T09:00:00Z"), 0);
});

test("payroll: overtime, unpaid leave, bonus and deductions", () => {
  const structure = { monthlyBase: 20800, workingDays: 26, dailyHours: 8, overtimeMultiplier: 1.5 };
  const records = [
    { checkIn: "2026-10-01T09:00:00Z", checkOut: "2026-10-01T19:00:00Z" }, // 10h -> 2h overtime
    { checkIn: "2026-10-02T09:00:00Z", checkOut: "2026-10-02T17:00:00Z" }, // 8h
    { checkIn: "2026-10-03T09:00:00Z", checkOut: null },                    // open, ignored
  ];
  const r = calculatePayroll(structure, records, { unpaidLeaveDays: 1, bonuses: 500, deductions: 200 });
  // hourly = 20800 / (26*8) = 100 ; overtime = 2 * 100 * 1.5 = 300 ; unpaid = 800
  assert.equal(r.daysWorked, 2);
  assert.equal(r.overtimeHours, 2);
  assert.equal(r.overtimePay, 300);
  assert.equal(r.unpaidLeaveDeduction, 800);
  assert.equal(r.grossPay, 21600);
  assert.equal(r.netPay, 20600);
});

test("payroll net pay never goes below zero", () => {
  const r = calculatePayroll({ monthlyBase: 1000 }, [], { deductions: 5000 });
  assert.equal(r.netPay, 0);
});

test("CSV escapes quotes and blocks formula injection", () => {
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("=HYPERLINK(\"x\")"), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell(-50), "-50", "real negative numbers stay numbers");
  assert.equal(csvCell(null), "");
  const csv = toCsv([{ key: "n", label: "Name" }, { key: "t", label: "Total (₹)" }], [{ n: "Burger", t: 120 }]);
  assert.ok(csv.startsWith("\uFEFFName,Total (₹)\r\nBurger,120"));
});

test("weighted average cost blends old stock with a new purchase", () => {
  assert.equal(weightedAverageCost(10, 100, 10, 120), 110);
  assert.equal(weightedAverageCost(0, 0, 5, 80), 80);
  assert.equal(weightedAverageCost(-3, 50, 5, 80), 80, "negative stock is ignored");
  assert.equal(weightedAverageCost(10, 100, 0, 999), 100);
});

test("menu item cost uses live ingredient costs", () => {
  const costs = new Map([["a", 200], ["b", 10]]);
  const cost = menuItemUnitCost({ purchaseCost: 0, packagingCost: 5, extraCost: 0, ingredients: [{ stockItem: "a", qty: 0.1 }, { stockItem: "b", qty: 3 }] }, costs);
  assert.equal(cost, 55);
});

test("leave days are clipped to the month", () => {
  assert.equal(leaveDaysInMonth("2026-10-10", "2026-10-12", 2026, 10), 3);
  assert.equal(leaveDaysInMonth("2026-09-29", "2026-10-02", 2026, 10), 2);
  assert.equal(leaveDaysInMonth("2026-10-30", "2026-11-03", 2026, 10), 2);
  assert.equal(leaveDaysInMonth("2026-11-01", "2026-11-02", 2026, 10), 0);
  assert.equal(leaveDaysInMonth("2026-10-05", "2026-10-01", 2026, 10), 0);
});

test("IST date rolls over at 18:30 UTC", () => {
  assert.equal(istDateString("2026-10-01T18:29:00Z"), "2026-10-01");
  assert.equal(istDateString("2026-10-01T18:30:00Z"), "2026-10-02");
});

test("allowed chat contacts follow the role rules", () => {
  const emps = [
    { _id: "sa", role: "SUPER_ADMIN" },
    { _id: "ad", role: "ADMIN" },
    { _id: "m1", role: "MANAGER" },
    { _id: "m2", role: "MANAGER" },
    { _id: "s1", role: "STAFF" },
    { _id: "s2", role: "STAFF" },
  ];
  const ids = (id, incoming = []) => allowedContactIds(emps.find((e) => e._id === id), emps, incoming).sort();
  assert.deepEqual(ids("sa"), ["ad", "m1", "m2", "s1", "s2"]);
  assert.deepEqual(ids("ad"), ["m1", "m2", "s1", "s2", "sa"]);
  assert.deepEqual(ids("m1"), ["ad", "s1", "s2", "sa"]);
  assert.deepEqual(ids("s1"), [], "users cannot start chats");
  assert.deepEqual(ids("s1", ["ad"]), ["ad"], "users can read incoming messages but cannot reply");
});

import { isConfigured, configuredProviders, buildAuthUrl, callbackUrl, isProvider, decideAccountAction, applyAuthMode, normalizeAuthMode, PROVIDERS } from "../utils/oauthProviders.js";
import { isEmployeeRole } from "../utils/permissions.js";

test("a provider is offered only when all its credentials exist", () => {
  const env = { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s", GITHUB_CLIENT_ID: "id", LINKEDIN_CLIENT_ID: "l", LINKEDIN_CLIENT_SECRET: "ls" };
  assert.equal(isConfigured("google", env), true);
  assert.equal(isConfigured("github", env), false, "github secret missing");
  assert.equal(isConfigured("linkedin", env), true);
  assert.equal(isConfigured("microsoft", env), false, "Microsoft sign-in was removed");
  assert.equal(isConfigured("apple", env), false, "Apple sign-in was removed");
  assert.deepEqual(configuredProviders(env), ["google", "linkedin"]);
  assert.deepEqual(Object.keys(PROVIDERS).sort(), ["facebook", "github", "google", "linkedin"]);
});

test("OAuth URLs carry state and the server callback", () => {
  const env = { LINKEDIN_CLIENT_ID: "my-id", LINKEDIN_CLIENT_SECRET: "s", BACKEND_URL: "https://api.example.com/" };
  assert.equal(callbackUrl("linkedin", env), "https://api.example.com/api/auth/oauth/linkedin/callback");
  const url = new URL(buildAuthUrl("linkedin", { state: "abc", env }));
  assert.equal(url.hostname, "www.linkedin.com");
  assert.equal(url.searchParams.get("client_id"), "my-id");
  assert.equal(url.searchParams.get("state"), "abc");
  assert.equal(isProvider("__proto__"), false);
});

const verified = { id: "p1", email: "a@b.com", emailVerified: true };
const decide = (o) => decideAccountAction({ profile: verified, isEmployeeRole, ...o }).action;

test("social sign-in links verified matching accounts and creates new customers", () => {
  assert.equal(decide({ existingByProvider: { role: "CUSTOMER" } }), "login");
  assert.equal(decide({ existingByEmail: { role: "CUSTOMER" } }), "link-account");
  assert.equal(decide({}), "create-customer");
});

test("an unverified provider email is never trusted", () => {
  const r = decideAccountAction({ profile: { id: "p", email: "a@b.com", emailVerified: false }, existingByEmail: { role: "CUSTOMER" }, isEmployeeRole });
  assert.equal(r.action, "reject");
  assert.equal(decideAccountAction({ profile: { id: "p", emailVerified: true }, isEmployeeRole }).action, "reject", "no email at all");
});

test("any provisioned role may link a verified provider with a matching email", () => {
  for (const role of ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "CUSTOMER"]) {
    assert.equal(decide({ existingByEmail: { role } }), "link-account", role);
  }
  assert.equal(decide({ existingByProvider: { role: "STAFF" } }), "login", "linked team accounts can use social sign-in");
});

test("suspended accounts are rejected on every path", () => {
  assert.equal(decide({ existingByProvider: { role: "CUSTOMER", isBlocked: true } }), "reject");
  assert.equal(decide({ existingByEmail: { role: "CUSTOMER", isBlocked: true } }), "reject");
});

import { ingredientsForOrder } from "../utils/recipes.js";

test("combo ingredients are deducted through the dishes inside the combo", () => {
  const menu = new Map([
    ["burger", { costing: { ingredients: [{ stockItem: "bun", qty: 1 }, { stockItem: "patty", qty: 0.15 }] } }],
    ["fries", { costing: { ingredients: [{ stockItem: "potato", qty: 0.2 }] } }],
  ]);
  const combos = new Map([["meal", { items: [{ menuItem: "burger", qty: 1 }, { menuItem: "fries", qty: 2 }] }]]);
  const lines = [
    { kind: "combo", combo: "meal", qty: 2 },       // 2 meals: 2 burgers, 4 fries
    { kind: "menu", menuItem: "burger", qty: 1 },   // 1 extra burger
  ];
  const totals = ingredientsForOrder(lines, menu, combos);
  assert.equal(totals.get("bun"), 3);
  assert.equal(totals.get("patty"), 0.45);
  assert.equal(totals.get("potato"), 0.8);
});

test("dishes without a recipe and unknown combos use no stock", () => {
  const totals = ingredientsForOrder([{ kind: "menu", menuItem: "x", qty: 5 }, { kind: "combo", combo: "gone", qty: 1 }], new Map(), new Map());
  assert.equal(totals.size, 0);
});

test("social login needs an existing account and sign up creates one", () => {
  const create = { action: "create-customer" };
  assert.equal(applyAuthMode(create, "login").action, "reject", "an unregistered person cannot log in");
  assert.equal(applyAuthMode(create, "login").to, "register");
  assert.equal(applyAuthMode(create, undefined).action, "reject", "a missing mode behaves like login");
  assert.equal(applyAuthMode(create, "signup").action, "create-customer");
  for (const action of ["login", "link-account"]) {
    assert.equal(applyAuthMode({ action }, "login").action, action, "registered people can log in");
    assert.equal(applyAuthMode({ action }, "signup").action, "reject", "registered people are told to log in");
  }
  assert.equal(applyAuthMode({ action: "reject", reason: "x" }, "signup").reason, "x");
  assert.equal(normalizeAuthMode("anything"), "login");
});
