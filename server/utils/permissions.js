// Central role and permission definitions. Every route authorizes through this file.

export const ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  CUSTOMER: "CUSTOMER",
});

export const EMPLOYEE_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF];

// Higher number means higher authority inside the employee hierarchy.
export const ROLE_RANK = Object.freeze({
  [ROLES.SUPER_ADMIN]: 4,
  [ROLES.MANAGER]: 3,
  [ROLES.ADMIN]: 2,
  [ROLES.STAFF]: 1,
  [ROLES.CUSTOMER]: 0,
});

// Which role an employee of a given role must report to.
export const REQUIRED_SUPERVISOR_ROLE = Object.freeze({
  [ROLES.MANAGER]: ROLES.SUPER_ADMIN,
  [ROLES.ADMIN]: ROLES.MANAGER,
  [ROLES.STAFF]: ROLES.ADMIN,
});

const { SUPER_ADMIN, ADMIN, MANAGER, STAFF } = ROLES;

// Permission name -> roles that hold it. Customers and guests hold no staff permission.
export const PERMISSIONS = Object.freeze({
  "dashboard.view": [SUPER_ADMIN, ADMIN, MANAGER],
  "orders.view": [SUPER_ADMIN, ADMIN, MANAGER, STAFF],
  "orders.update": [SUPER_ADMIN, ADMIN, MANAGER, STAFF],
  "orders.assign": [SUPER_ADMIN, ADMIN, MANAGER],
  "payments.manage": [SUPER_ADMIN, ADMIN, MANAGER],
  "menu.manage": [SUPER_ADMIN, ADMIN, MANAGER],
  "menu.availability": [SUPER_ADMIN, ADMIN, MANAGER, STAFF],
  "coupons.manage": [SUPER_ADMIN, ADMIN],
  "reservations.manage": [SUPER_ADMIN, ADMIN, MANAGER, STAFF],
  "customers.view": [SUPER_ADMIN, ADMIN, MANAGER],
  "customers.block": [SUPER_ADMIN, ADMIN],
  "reviews.moderate": [SUPER_ADMIN, ADMIN, MANAGER],
  "settings.manage": [SUPER_ADMIN, ADMIN],
  "messages.manage": [SUPER_ADMIN, ADMIN, MANAGER],
  "messages.delete": [SUPER_ADMIN, ADMIN],
  "team.view": [SUPER_ADMIN, MANAGER, ADMIN],
  "team.create": [SUPER_ADMIN, MANAGER, ADMIN],
  "team.manage": [SUPER_ADMIN],
  "team.activity": [SUPER_ADMIN, MANAGER, ADMIN],
  "team.sessions": [SUPER_ADMIN, MANAGER, ADMIN],
  "team.changeRole": [SUPER_ADMIN],
  "audit.view": [SUPER_ADMIN, ADMIN, MANAGER, STAFF],
  "security.manage": [SUPER_ADMIN],
  "newsletter.manage": [SUPER_ADMIN, ADMIN, MANAGER],
  // Internal employee chat. Only the Super Admin may delete a message.
  "chat.use": [SUPER_ADMIN, ADMIN, MANAGER, STAFF],
  "chat.delete": [SUPER_ADMIN],
  "chat.monitor": [SUPER_ADMIN],
  // Inventory, suppliers and purchasing
  "inventory.view": [SUPER_ADMIN, ADMIN, MANAGER, STAFF],
  "inventory.manage": [SUPER_ADMIN, ADMIN, MANAGER],
  "suppliers.manage": [SUPER_ADMIN, ADMIN, MANAGER],
  "purchases.manage": [SUPER_ADMIN, ADMIN, MANAGER],
  // Money: costing, expenses, reports
  "costing.view": [SUPER_ADMIN, ADMIN, MANAGER],
  "expenses.manage": [SUPER_ADMIN, ADMIN],
  "reports.view": [SUPER_ADMIN, ADMIN],
  // Attendance is self service for everyone. Payroll and salaries are restricted.
  "attendance.self": [SUPER_ADMIN, ADMIN, MANAGER, STAFF],
  "attendance.viewTeam": [SUPER_ADMIN, ADMIN, MANAGER],
  "payroll.manage": [SUPER_ADMIN],
  "payroll.viewOwn": [SUPER_ADMIN, ADMIN, MANAGER, STAFF],
});

export const isEmployeeRole = (role) => EMPLOYEE_ROLES.includes(role);

export const hasPermission = (role, permission) => Boolean(PERMISSIONS[permission]?.includes(role));

// Roles an actor is allowed to create.
export const creatableRoles = (actorRole) => {
  if (actorRole === SUPER_ADMIN) return [MANAGER, ADMIN, STAFF];
  if (actorRole === MANAGER) return [ADMIN, STAFF];
  if (actorRole === ADMIN) return [STAFF];
  return [];
};

export const canCreateRole = (actorRole, targetRole) => creatableRoles(actorRole).includes(targetRole);

// Reporting hierarchy: Super Admin > Manager > Admin > User.
export const isValidSupervisorRole = (employeeRole, supervisorRole) =>
  REQUIRED_SUPERVISOR_ROLE[employeeRole] === supervisorRole;

// Collects the ids of every employee below `rootId` in the reporting tree.
// `users` is a flat list of { _id, reportsTo }. Cycles are ignored safely.
export const collectDownlineIds = (users, rootId) => {
  const childrenOf = new Map();
  for (const user of users) {
    if (!user.reportsTo) continue;
    const key = String(user.reportsTo);
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key).push(String(user._id));
  }

  const found = new Set();
  const queue = [String(rootId)];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const childId of childrenOf.get(current) || []) {
      if (!found.has(childId) && childId !== String(rootId)) {
        found.add(childId);
        queue.push(childId);
      }
    }
  }
  return [...found];
};

// Whether the actor may administer the target account (profile, suspension, password reset).
// The Super Admin account itself can never be administered by anyone else.
export const canAdminister = (actor, target, downlineIds) => {
  if (!actor || !target) return false;
  if (String(actor._id) === String(target._id)) return false;
  if (target.role === SUPER_ADMIN) return false;
  if (actor.role === SUPER_ADMIN) return isEmployeeRole(target.role);
  return [MANAGER, ADMIN].includes(actor.role)
    && ROLE_RANK[target.role] < ROLE_RANK[actor.role]
    && downlineIds.includes(String(target._id));
};

// Builds the audit log filter that matches what the actor is allowed to see.
export const buildAuditScope = (actor, downlineIds) => {
  if (actor.role === SUPER_ADMIN) return {};
  if (actor.role === ADMIN || actor.role === MANAGER) {
    return { actor: { $in: [String(actor._id), ...downlineIds] } };
  }
  return { actor: String(actor._id) };
};
