import { ROLES, isEmployeeRole } from "./permissions.js";

const { SUPER_ADMIN, ADMIN, MANAGER, STAFF } = ROLES;

// Who may START a private chat with whom, decided by role (the server decides, never the client).
//  - Super Admin: every employee.
//  - Manager:     Super Admin, Admin and User.
//  - Admin:       Super Admin, Manager and User.
//  - User:        cannot send or reply to messages.
const MAY_START = Object.freeze({
  [SUPER_ADMIN]: [ADMIN, MANAGER, STAFF],
  [MANAGER]: [SUPER_ADMIN, ADMIN, STAFF],
  [ADMIN]: [SUPER_ADMIN, MANAGER, STAFF],
  [STAFF]: [],
});

// `hasIncoming` is true when the target has already sent the actor a message.
export const canChatWith = (actor, target, hasIncoming = false) => {
  if (!actor || !target) return false;
  if (String(actor._id) === String(target._id)) return false;
  if (!isEmployeeRole(actor.role) || !isEmployeeRole(target.role)) return false;
  if (actor.isBlocked || target.isBlocked) return false;
  if (MAY_START[actor.role]?.includes(target.role)) return true;
  return actor.role === STAFF && Boolean(hasIncoming);
};

// Who may read a conversation between two OTHER people (read only oversight).
// Only the Super Admin may inspect conversations between other people.
export const canMonitorConversation = (viewer, a, b) => {
  if (!viewer || !a || !b) return false;
  if (!isEmployeeRole(a.role) || !isEmployeeRole(b.role)) return false;
  if (viewer.role === SUPER_ADMIN) return true;
  return false;
};

export const canMonitorChats = (role) => role === SUPER_ADMIN;

// A stable key for a pair of users so the same two people always share one conversation.
export const pairKey = (a, b) => [String(a), String(b)].sort().join(":");

// Only the Super Admin may delete messages. Enforced again in the route middleware.
export const canDeleteChatMessage = (actor) => actor?.role === SUPER_ADMIN;

// Trims and bounds a chat message. Returns "" when nothing usable is left.
export const sanitizeMessageText = (text, max = 2000) => String(text ?? "").replace(/\u0000/g, "").trim().slice(0, max);

// Ids of every employee the actor may chat with. `employees` is a lean list of { _id, role, isBlocked }.
// `incomingFromIds` are the ids of people who have already messaged the actor.
export const allowedContactIds = (actor, employees, incomingFromIds = []) => {
  if (!actor || !isEmployeeRole(actor.role)) return [];
  const incoming = new Set(incomingFromIds.map(String));
  return employees
    .filter((e) => canChatWith(actor, e, incoming.has(String(e._id))))
    .map((e) => String(e._id));
};
