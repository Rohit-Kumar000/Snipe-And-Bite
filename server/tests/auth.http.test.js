import test, { before, after, mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

// Social sign-in and 2FA rules, tested over HTTP with the database lookups replaced.
process.env.JWT_SECRET = "y".repeat(48);
process.env.NODE_ENV = "test";

const { default: app } = await import("../app.js");
const { default: User } = await import("../models/User.js");

let server;
let base;
before(async () => {
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); mock.restoreAll(); });

const post = async (path, body) => {
  const res = await fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => ({})), cookie: res.headers.get("set-cookie") };
};

const exchangeCode = (user, jti = "j1") => jwt.sign({ id: user._id, purpose: "oauth-exchange", jti }, process.env.JWT_SECRET, { expiresIn: 60 });
const stubUser = (user) => {
  mock.restoreAll();
  const record = { ...user, oauthJti: "j1", save: async () => {} };
  mock.method(User, "findById", () => ({ select: async () => record }));
  return record;
};

test("with 2FA on, social sign-in returns a challenge and never a session", async () => {
  const user = stubUser({ _id: "64b000000000000000000001", role: "CUSTOMER", isBlocked: false, twoFactor: { enabled: true } });
  const res = await post("/api/auth/oauth/exchange", { code: exchangeCode(user) });
  assert.equal(res.status, 200);
  assert.equal(res.json.requires2FA, true);
  assert.ok(res.json.challengeToken);
  assert.equal(res.json.token, undefined, "no session token before the 2FA code");
  assert.equal(res.cookie, null, "no session cookie before the 2FA code");
  const decoded = jwt.verify(res.json.challengeToken, process.env.JWT_SECRET);
  assert.equal(decoded.purpose, "2fa", "the challenge cannot be used as a session token");
});

test("a social sign-in code works only once", async () => {
  const user = stubUser({ _id: "64b000000000000000000002", role: "CUSTOMER", isBlocked: false, twoFactor: { enabled: true } });
  const code = exchangeCode(user);
  const record = await User.findById().select();
  record.oauthJti = undefined; // already used
  const res = await post("/api/auth/oauth/exchange", { code });
  assert.equal(res.status, 401);
});

test("a wrong, expired or session token is refused as a sign-in code", async () => {
  const user = stubUser({ _id: "64b000000000000000000003", role: "CUSTOMER", isBlocked: false, twoFactor: { enabled: true } });
  const wrongPurpose = jwt.sign({ id: user._id, purpose: "2fa", jti: "j1" }, process.env.JWT_SECRET, { expiresIn: 60 });
  assert.equal((await post("/api/auth/oauth/exchange", { code: wrongPurpose })).status, 401);
  const expired = jwt.sign({ id: user._id, purpose: "oauth-exchange", jti: "j1" }, process.env.JWT_SECRET, { expiresIn: -10 });
  assert.equal((await post("/api/auth/oauth/exchange", { code: expired })).status, 401);
  assert.equal((await post("/api/auth/oauth/exchange", { code: "garbage" })).status, 401);
});

test("a suspended account cannot finish a social sign-in", async () => {
  const user = stubUser({ _id: "64b000000000000000000004", role: "CUSTOMER", isBlocked: true, twoFactor: { enabled: false } });
  assert.equal((await post("/api/auth/oauth/exchange", { code: exchangeCode(user) })).status, 401);
});

test("public sign-up can only create customers, whatever the request says", async () => {
  mock.restoreAll();
  let created;
  mock.method(User, "findOne", async () => null);
  mock.method(User, "create", async (data) => { created = data; throw new Error("stop after capture"); });
  await post("/api/auth/register", { name: "Eve", email: "eve@example.com", password: "Passw0rd!x", phone: "9876543210", role: "SUPER_ADMIN" });
  assert.ok(created, "register reached User.create");
  assert.equal(created.role, "CUSTOMER");
});

test("the provider list only shows configured providers and never Apple", async () => {
  delete process.env.GOOGLE_CLIENT_ID;
  const res = await fetch(`${base}/api/auth/oauth/providers`);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.ok(!json.providers.some((p) => p.id === "apple"));
});

test("the user model accepts exactly the supported providers", async () => {
  const { PROVIDERS } = await import("../utils/oauthProviders.js");
  const allowed = User.schema.path("oauth").schema.path("provider").enumValues;
  assert.deepEqual([...allowed].sort(), Object.keys(PROVIDERS).sort());
});


test("starting a provider that is not configured sends the person back to login", async () => {
  const originalClientId = process.env.GITHUB_CLIENT_ID;
  const originalClientSecret = process.env.GITHUB_CLIENT_SECRET;

  try {
    // Ensure GitHub is not configured for this test.
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;

    const res = await fetch(`${base}/api/auth/oauth/github`, {
      redirect: "manual",
    });

    assert.equal(res.status, 302);
    assert.match(
      res.headers.get("location"),
      /\/login\?oauthError=/
    );
  } finally {
    // Restore the original environment.
    if (originalClientId === undefined) {
      delete process.env.GITHUB_CLIENT_ID;
    } else {
      process.env.GITHUB_CLIENT_ID = originalClientId;
    }

    if (originalClientSecret === undefined) {
      delete process.env.GITHUB_CLIENT_SECRET;
    } else {
      process.env.GITHUB_CLIENT_SECRET = originalClientSecret;
    }
  }
});
