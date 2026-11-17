import test, { before, after, mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

// Route level authorization for the chat, inventory, finance and HR modules.
// The permission check runs before any database work, so these tests need no database.
process.env.JWT_SECRET = "x".repeat(48);
process.env.NODE_ENV = "test";

const { default: app } = await import("../app.js");
const { default: User } = await import("../models/User.js");
const { default: Session } = await import("../models/Session.js");

let server;
let base;
before(async () => {
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); mock.restoreAll(); });

const call = async (path, { method = "GET", token } = {}) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: method === "GET" ? undefined : JSON.stringify({}),
  });
  return response.status;
};

const signInAs = (role) => {
  mock.restoreAll();
  const user = { _id: "64b000000000000000000001", name: "Test", role, isBlocked: false, mustChangePassword: false, twoFactor: { enabled: true } };
  const session = { _id: "64b0000000000000000000aa", user: user._id, expiresAt: new Date(Date.now() + 3600_000), lastSeenAt: new Date(), save: async () => {} };
  mock.method(User, "findById", async () => user);
  mock.method(Session, "findById", async () => session);
  return jwt.sign({ id: user._id, sid: session._id }, process.env.JWT_SECRET, { expiresIn: 600 });
};

const ID = "64b0000000000000000000bb";
const ROUTES = {
  chatContacts: ["GET", "/api/chat/contacts"],
  chatDelete: ["DELETE", `/api/chat/messages/${ID}`],
  chatMonitor: ["GET", `/api/chat/monitor/${ID}/${ID}`],
  stockList: ["GET", "/api/inventory/stock"],
  stockCreate: ["POST", "/api/inventory/stock"],
  purchases: ["GET", "/api/inventory/purchases"],
  costing: ["GET", "/api/inventory/costing"],
  expenses: ["GET", "/api/expenses"],
  reports: ["GET", "/api/reports/summary"],
  attendanceMe: ["GET", "/api/hr/attendance/me"],
  attendanceTeam: ["GET", "/api/hr/attendance/team"],
  payroll: ["GET", "/api/hr/payroll"],
  structures: ["GET", "/api/hr/payroll/structures"],
};

test("every new module rejects requests without a token", async () => {
  for (const [name, [method, path]] of Object.entries(ROUTES)) {
    assert.equal(await call(path, { method }), 401, name);
  }
});

// Which routes each role must NOT reach (403). Anything not listed is allowed through the permission gate.
const FORBIDDEN = {
  CUSTOMER: Object.keys(ROUTES),
  STAFF: ["chatDelete", "chatMonitor", "stockCreate", "purchases", "costing", "expenses", "reports", "attendanceTeam", "payroll", "structures"],
  MANAGER: ["chatDelete", "chatMonitor", "expenses", "reports", "payroll", "structures"],
  ADMIN: ["chatDelete", "chatMonitor", "payroll", "structures"],
};

for (const [role, names] of Object.entries(FORBIDDEN)) {
  test(`${role} is refused the routes outside its permissions`, async () => {
    const token = signInAs(role);
    for (const name of names) {
      const [method, path] = ROUTES[name];
      assert.equal(await call(path, { method, token }), 403, `${role} ${name}`);
    }
  });
}

test("only the Super Admin passes the chat delete, chat monitor and payroll gates", async () => {
  const token = signInAs("SUPER_ADMIN");
  for (const name of ["chatDelete", "chatMonitor", "payroll", "structures"]) {
    const [method, path] = ROUTES[name];
    const status = await call(path, { method, token });
    assert.notEqual(status, 401, name);
    assert.notEqual(status, 403, name);
  }
});

test("a staff member cannot assign orders", async () => {
  const token = signInAs("STAFF");
  assert.equal(await call(`/api/orders/${ID}/assign`, { method: "PUT", token }), 403);
  assert.equal(await call(`/api/orders/${ID}/assignments`, { token }), 403);
});
