import test from "node:test";
import assert from "node:assert/strict";
import {
  ROLES, hasPermission, canCreateRole, canAdminister, collectDownlineIds,
  buildAuditScope, isValidSupervisorRole, creatableRoles,
} from "../utils/permissions.js";
import {
  base32Encode, base32Decode, hotp, totp, verifyTotp, generateRecoveryCodes, hashRecoveryCode, generateSecret,
} from "../utils/totp.js";
import { encryptSecret, decryptSecret } from "../utils/secretBox.js";
import { SESSION_TTL_MS, isSessionExpired, idleTimeoutMs, describeDevice, validatePasswordStrength } from "../utils/sessionPolicy.js";

// RFC 6238 appendix B uses the ASCII key "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

test("TOTP matches the RFC 6238 SHA-1 test vectors", () => {
  assert.equal(totp(RFC_SECRET, { timeMs: 59 * 1000, digits: 8 }), "94287082");
  assert.equal(totp(RFC_SECRET, { timeMs: 1111111109 * 1000, digits: 8 }), "07081804");
  assert.equal(totp(RFC_SECRET, { timeMs: 1234567890 * 1000, digits: 8 }), "89005924");
  assert.equal(totp(RFC_SECRET, { timeMs: 2000000000 * 1000, digits: 8 }), "69279037");
});

test("HOTP matches the RFC 4226 vectors", () => {
  assert.equal(hotp(RFC_SECRET, 0), "755224");
  assert.equal(hotp(RFC_SECRET, 1), "287082");
  assert.equal(hotp(RFC_SECRET, 9), "520489");
});

test("base32 round trips", () => {
  const raw = Buffer.from("snipe-and-bite");
  assert.deepEqual(base32Decode(base32Encode(raw)), raw);
  assert.throws(() => base32Decode("not valid 1"));
});

test("verifyTotp accepts one step of drift and rejects older codes", () => {
  const now = 1_700_000_000_000;
  const current = totp(RFC_SECRET, { timeMs: now });
  assert.equal(verifyTotp(RFC_SECRET, current, { timeMs: now }), true);
  assert.equal(verifyTotp(RFC_SECRET, totp(RFC_SECRET, { timeMs: now - 30000 }), { timeMs: now }), true);
  assert.equal(verifyTotp(RFC_SECRET, totp(RFC_SECRET, { timeMs: now - 120000 }), { timeMs: now }), false);
  assert.equal(verifyTotp(RFC_SECRET, "abcdef", { timeMs: now }), false);
  assert.equal(verifyTotp(RFC_SECRET, "", { timeMs: now }), false);
});

test("generated secrets are valid base32 and recovery codes hash consistently", () => {
  assert.match(generateSecret(), /^[A-Z2-7]{32}$/);
  const codes = generateRecoveryCodes(10);
  assert.equal(new Set(codes).size, 10);
  assert.equal(hashRecoveryCode(codes[0]), hashRecoveryCode(` ${codes[0].toUpperCase()} `));
});

test("secret box encrypts and decrypts, and detects tampering", () => {
  process.env.TWO_FACTOR_ENCRYPTION_KEY = "unit-test-key";
  const packed = encryptSecret("JBSWY3DPEHPK3PXP");
  assert.notEqual(packed, "JBSWY3DPEHPK3PXP");
  assert.equal(decryptSecret(packed), "JBSWY3DPEHPK3PXP");
  const parts = packed.split(".");
  parts[2] = Buffer.from("tampered").toString("base64");
  assert.throws(() => decryptSecret(parts.join(".")));
});

test("role permissions follow the hierarchy", () => {
  assert.equal(hasPermission(ROLES.SUPER_ADMIN, "team.changeRole"), true);
  assert.equal(hasPermission(ROLES.ADMIN, "team.changeRole"), false);
  assert.equal(hasPermission(ROLES.STAFF, "menu.manage"), false);
  assert.equal(hasPermission(ROLES.STAFF, "orders.update"), true);
  assert.equal(hasPermission(ROLES.STAFF, "orders.assign"), false);
  assert.equal(hasPermission(ROLES.MANAGER, "orders.assign"), true);
  assert.equal(hasPermission(ROLES.CUSTOMER, "orders.view"), false);
  assert.equal(hasPermission(ROLES.MANAGER, "settings.manage"), false);
  assert.equal(hasPermission(ROLES.ADMIN, "does.not.exist"), false);
});

test("team creation follows the Super Admin > Manager > Admin > User hierarchy", () => {
  assert.deepEqual(creatableRoles(ROLES.SUPER_ADMIN), ["MANAGER", "ADMIN", "STAFF"]);
  assert.equal(canCreateRole(ROLES.MANAGER, ROLES.ADMIN), true);
  assert.equal(canCreateRole(ROLES.MANAGER, ROLES.STAFF), true);
  assert.equal(canCreateRole(ROLES.ADMIN, ROLES.STAFF), true);
  assert.equal(canCreateRole(ROLES.ADMIN, ROLES.MANAGER), false);
  assert.equal(canCreateRole(ROLES.SUPER_ADMIN, ROLES.SUPER_ADMIN), false);
  assert.equal(canCreateRole(ROLES.SUPER_ADMIN, ROLES.CUSTOMER), false);
});

test("supervisor roles must follow Super Admin > Manager > Admin > User", () => {
  assert.equal(isValidSupervisorRole(ROLES.STAFF, ROLES.ADMIN), true);
  assert.equal(isValidSupervisorRole(ROLES.STAFF, ROLES.MANAGER), false);
  assert.equal(isValidSupervisorRole(ROLES.ADMIN, ROLES.MANAGER), true);
  assert.equal(isValidSupervisorRole(ROLES.MANAGER, ROLES.SUPER_ADMIN), true);
});

const tree = [
  { _id: "sa", reportsTo: null },
  { _id: "m1", reportsTo: "sa" },
  { _id: "m2", reportsTo: "sa" },
  { _id: "a1", reportsTo: "m1" },
  { _id: "a2", reportsTo: "m1" },
  { _id: "a3", reportsTo: "m2" },
  { _id: "s1", reportsTo: "a1" },
  { _id: "s2", reportsTo: "a1" },
  { _id: "s3", reportsTo: "a3" },
];

test("downline collection walks the whole reporting tree", () => {
  assert.deepEqual(collectDownlineIds(tree, "m1").sort(), ["a1", "a2", "s1", "s2"]);
  assert.deepEqual(collectDownlineIds(tree, "a3"), ["s3"]);
  assert.deepEqual(collectDownlineIds(tree, "s1"), []);
  assert.equal(collectDownlineIds(tree, "sa").length, 8);
});

test("downline collection survives a reporting cycle", () => {
  const cyclic = [{ _id: "x", reportsTo: "y" }, { _id: "y", reportsTo: "x" }];
  assert.deepEqual(collectDownlineIds(cyclic, "x"), ["y"]);
});

test("administering accounts is limited to the actor's own downline", () => {
  const superAdmin = { _id: "sa", role: ROLES.SUPER_ADMIN };
  const manager1 = { _id: "m1", role: ROLES.MANAGER };
  const downlineOfM1 = collectDownlineIds(tree, "m1");

  assert.equal(canAdminister(superAdmin, { _id: "a1", role: ROLES.ADMIN }, []), true);
  assert.equal(canAdminister(superAdmin, { _id: "sa", role: ROLES.SUPER_ADMIN }, []), false);
  assert.equal(canAdminister(manager1, { _id: "a1", role: ROLES.ADMIN }, downlineOfM1), true);
  assert.equal(canAdminister(manager1, { _id: "a3", role: ROLES.ADMIN }, downlineOfM1), false);
  assert.equal(canAdminister(manager1, { _id: "s1", role: ROLES.STAFF }, downlineOfM1), true);
  assert.equal(canAdminister(manager1, { _id: "sa", role: ROLES.SUPER_ADMIN }, downlineOfM1), false);
  assert.equal(canAdminister(manager1, manager1, downlineOfM1), false);
  assert.equal(canAdminister({ _id: "a1", role: ROLES.ADMIN }, { _id: "s1", role: ROLES.STAFF }, ["s1"]), true);
  assert.equal(canAdminister({ _id: "c1", role: ROLES.CUSTOMER }, { _id: "s1", role: ROLES.STAFF }, ["s1"]), false);
});

test("audit visibility follows the role scope rules", () => {
  assert.deepEqual(buildAuditScope({ _id: "sa", role: ROLES.SUPER_ADMIN }, []), {});
  const adminScope = buildAuditScope({ _id: "a1", role: ROLES.ADMIN }, ["s1"]);
  assert.deepEqual(adminScope.actor.$in.sort(), ["a1", "s1"]);
  const managerScope = buildAuditScope({ _id: "m1", role: ROLES.MANAGER }, ["s1", "s2"]);
  assert.deepEqual(managerScope.actor.$in.sort(), ["m1", "s1", "s2"]);
  assert.deepEqual(buildAuditScope({ _id: "s1", role: ROLES.STAFF }, ["ignored"]), { actor: "s1" });
});

test("session lifetime and expiry rules", () => {
  assert.equal(SESSION_TTL_MS, 9 * 3600 * 1000, "every session lasts 9 hours");

  const now = Date.now();
  const live = { expiresAt: new Date(now + 60000), lastSeenAt: new Date(now - 1000) };
  assert.equal(isSessionExpired(live, now, 0), false);
  assert.equal(isSessionExpired({ ...live, revokedAt: new Date() }, now, 0), true);
  assert.equal(isSessionExpired({ ...live, expiresAt: new Date(now - 1) }, now, 0), true);
  assert.equal(isSessionExpired({ ...live, lastSeenAt: new Date(now - 20 * 60000) }, now, 15 * 60000), true);
  assert.equal(isSessionExpired(null, now, 0), true);
  assert.equal(idleTimeoutMs({ SESSION_IDLE_MINUTES: "30" }), 30 * 60000);
  assert.equal(idleTimeoutMs({}), 0);
});

test("device labels and password strength", () => {
  assert.equal(describeDevice("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36"), "Chrome on Windows");
  assert.equal(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17) Safari/604.1"), "Safari on iOS");
  assert.equal(validatePasswordStrength("short1"), "Password must be at least 8 characters");
  assert.equal(validatePasswordStrength("onlyletters"), "Password must contain letters and numbers");
  assert.equal(validatePasswordStrength("goodpass123"), null);
});
