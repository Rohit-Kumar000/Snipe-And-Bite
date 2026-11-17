import test, { before, after, mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "x".repeat(48);
process.env.NODE_ENV = "test";

const { default: app } = await import("../app.js");
const { default: User } = await import("../models/User.js");
const { default: Session } = await import("../models/Session.js");

let server;
let base;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  mock.restoreAll();
});

const call = async (path, { method = "GET", body, token } = {}) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body && method !== "GET" ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, json: await response.json().catch(() => ({})) };
};

// Signs in as a fake user by stubbing the two database lookups used by the protect middleware.
const signInAs = (userOverrides = {}) => {
  const user = {
    _id: "64b000000000000000000001", name: "Test User", role: "CUSTOMER", isBlocked: false,
    mustChangePassword: false, twoFactor: { enabled: true }, ...userOverrides,
  };
  const session = {
    _id: "64b0000000000000000000aa", user: user._id, revokedAt: undefined,
    expiresAt: new Date(Date.now() + 3600_000), lastSeenAt: new Date(), save: async () => {},
  };
  mock.method(User, "findById", async () => user);
  mock.method(Session, "findById", async () => session);
  return jwt.sign({ id: user._id, sid: session._id }, process.env.JWT_SECRET, { expiresIn: 600 });
};

test("health check works without a database", async () => {
  const { status, json } = await call("/api/health");
  assert.equal(status, 200);
  assert.equal(json.status, "ok");
});

test("protected routes reject requests without a token", async () => {
  for (const path of ["/api/auth/me", "/api/team", "/api/audit-logs", "/api/notifications", "/api/contact", "/api/orders/my"]) {
    const { status, json } = await call(path);
    assert.equal(status, 401, path);
    assert.equal(json.code, "SESSION_EXPIRED", `${path} tells the web app the session is over`);
  }
});

test("a token without a session id is rejected", async () => {
  const legacy = jwt.sign({ id: "64b000000000000000000001" }, process.env.JWT_SECRET);
  const { status } = await call("/api/auth/me", { token: legacy });
  assert.equal(status, 401);
});

test("a two-factor challenge token cannot be used as a session", async () => {
  const challenge = jwt.sign({ id: "64b000000000000000000001", purpose: "2fa", sid: "64b0000000000000000000aa" }, process.env.JWT_SECRET);
  const { status } = await call("/api/auth/me", { token: challenge });
  assert.equal(status, 401);
});

test("registration validates name, email and password strength", async () => {
  const weak = await call("/api/auth/register", { method: "POST", body: { name: "A", email: "a@b.com", password: "short" } });
  assert.equal(weak.status, 400);
  assert.match(weak.json.message, /at least 8/);

  const noDigits = await call("/api/auth/register", { method: "POST", body: { name: "Asha", email: "asha@example.com", password: "onlyletters" } });
  assert.match(noDigits.json.message, /letters and numbers/);

  const badEmail = await call("/api/auth/register", { method: "POST", body: { name: "Asha", email: "nope", password: "goodpass123" } });
  assert.equal(badEmail.status, 400);
});

test("registration ignores any role sent by the client", async () => {
  // Validation passes, so the request reaches the database layer. Stub it and capture what would be stored.
  let created;
  mock.method(User, "findOne", async () => null);
  mock.method(User, "create", async (data) => { created = data; throw Object.assign(new Error("stop here"), { statusCode: 418 }); });
  await call("/api/auth/register", { method: "POST", body: { name: "Eve", email: "eve@example.com", password: "goodpass123", role: "SUPER_ADMIN" } });
  assert.equal(created.role, "CUSTOMER");
  mock.restoreAll();
});

test("contact form validates input and accepts a honeypot hit silently", async () => {
  const bad = await call("/api/contact", { method: "POST", body: { name: "R", email: "x", subject: "", message: "short" } });
  assert.equal(bad.status, 400);

  const bot = await call("/api/contact", {
    method: "POST",
    body: { name: "Bot Person", email: "bot@example.com", subject: "Cheap deals", message: "buy buy buy buy buy", website: "http://spam.example" },
  });
  assert.equal(bot.status, 201);
  assert.equal(bot.json.emailed, false);
});

test("a customer cannot reach any employee endpoint", async () => {
  const token = signInAs({ role: "CUSTOMER" });
  for (const [path, method] of [
    ["/api/orders", "GET"], ["/api/dashboard/stats", "GET"], ["/api/team", "GET"], ["/api/audit-logs", "GET"],
    ["/api/contact", "GET"], ["/api/users", "GET"], ["/api/coupons", "GET"], ["/api/reviews", "GET"],
  ]) {
    const { status } = await call(path, { method, token });
    assert.equal(status, 403, `${method} ${path}`);
  }
  mock.restoreAll();
});

test("staff cannot manage menu, team, settings, coupons or finances", async () => {
  const token = signInAs({ role: "STAFF" });
  for (const [path, method] of [
    ["/api/menu", "POST"], ["/api/team", "POST"], ["/api/team", "GET"], ["/api/coupons", "GET"],
    ["/api/dashboard/stats", "GET"], ["/api/orders/64b000000000000000000009/payment-status", "PUT"],
    ["/api/orders/64b000000000000000000009/assign", "PUT"],
  ]) {
    const { status } = await call(path, { method, token, body: {} });
    assert.equal(status, 403, `${method} ${path}`);
  }
  mock.restoreAll();
});

test("only the Super Admin can change roles, and managers cannot create the Super Admin role", async () => {
  const adminToken = signInAs({ role: "ADMIN" });
  const roleChange = await call("/api/team/64b000000000000000000009/role", { method: "PUT", token: adminToken, body: { role: "STAFF", adminPassword: "x" } });
  assert.equal(roleChange.status, 403);
  mock.restoreAll();

  const managerToken = signInAs({ role: "MANAGER" });
  const create = await call("/api/team", { method: "POST", token: managerToken, body: { name: "N", email: "n@example.com", role: "SUPER_ADMIN" } });
  assert.equal(create.status, 400);
  mock.restoreAll();
});

test("team creation rejects roles outside Manager, Admin and User", async () => {
  const token = signInAs({ role: "SUPER_ADMIN" });
  const { status, json } = await call("/api/team", { method: "POST", token, body: { name: "Sneaky", email: "s@example.com", role: "SUPER_ADMIN" } });
  assert.equal(status, 400);
  assert.match(json.message, /Manager, Admin or User/);
  mock.restoreAll();
});

test("a Super Admin without two-factor is blocked everywhere except setup", async () => {
  const token = signInAs({ role: "SUPER_ADMIN", twoFactor: { enabled: false } });
  const orders = await call("/api/orders", { token });
  assert.equal(orders.status, 403);
  assert.equal(orders.json.code, "2FA_SETUP_REQUIRED");

  const me = await call("/api/auth/me", { token });
  assert.equal(me.status, 200);
  assert.equal(me.json.twoFactorSetupRequired, true);
  mock.restoreAll();
});

test("a forced password change blocks everything except changing the password", async () => {
  const token = signInAs({ role: "STAFF", mustChangePassword: true });
  const orders = await call("/api/orders", { token });
  assert.equal(orders.status, 403);
  assert.equal(orders.json.code, "PASSWORD_CHANGE_REQUIRED");
  const me = await call("/api/auth/me", { token });
  assert.equal(me.status, 200);
  mock.restoreAll();
});

test("suspended accounts and revoked sessions are rejected", async () => {
  const suspendedToken = signInAs({ role: "STAFF", isBlocked: true });
  const suspended = await call("/api/auth/me", { token: suspendedToken });
  assert.equal(suspended.status, 403);
  assert.equal(suspended.json.code, "ACCOUNT_SUSPENDED");
  mock.restoreAll();

  const token = signInAs({ role: "STAFF" });
  mock.method(Session, "findById", async () => ({
    _id: "64b0000000000000000000aa", user: "64b000000000000000000001", revokedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600_000), lastSeenAt: new Date(), save: async () => {},
  }));
  const revoked = await call("/api/auth/me", { token });
  assert.equal(revoked.status, 401);
  assert.equal(revoked.json.code, "SESSION_EXPIRED");
  mock.restoreAll();
});

test("two-factor disable is refused for the Super Admin", async () => {
  const token = signInAs({ role: "SUPER_ADMIN", twoFactor: { enabled: true } });
  const { status } = await call("/api/auth/2fa/disable", { method: "POST", token, body: { code: "123456", password: "x" } });
  // Either the controller refuses (403) or password lookup is attempted; the refusal must happen first.
  assert.equal(status, 403);
  mock.restoreAll();
});

test("unknown routes return a JSON 404", async () => {
  const { status, json } = await call("/api/nope");
  assert.equal(status, 404);
  assert.equal(json.success, false);
});
