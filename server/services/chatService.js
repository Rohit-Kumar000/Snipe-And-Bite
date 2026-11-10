import ChatMessage from "../models/ChatMessage.js";
import User from "../models/User.js";
import { EMPLOYEE_ROLES, ROLES } from "../utils/permissions.js";
import { allowedContactIds, pairKey, sanitizeMessageText } from "../utils/chatPolicy.js";
import { emitToUser } from "../socket/io.js";
import { httpError } from "../utils/helpers.js";
import { notifyUsers } from "./notificationService.js";

const loadEmployees = () => User.find({ role: { $in: EMPLOYEE_ROLES } }).select("_id role isBlocked name").lean();

// Ids (strings) of everyone this user may chat with. Always computed on the server.
export const contactIdsFor = async (actor) => {
  // User accounts may read incoming chats but cannot send messages.
  const [employees, incoming] = await Promise.all([
    loadEmployees(),
    actor.role === ROLES.STAFF ? ChatMessage.distinct("from", { to: actor._id, deletedAt: null }) : [],
  ]);
  return allowedContactIds(actor, employees, incoming);
};

const publicMessage = (m) => ({
  _id: String(m._id), pair: m.pair, from: String(m.from), to: String(m.to),
  text: m.deletedAt ? "" : m.text, deleted: Boolean(m.deletedAt), readAt: m.readAt, createdAt: m.createdAt,
});

// Stores a message and pushes it live to both people.
export const sendMessage = async (actor, toId, rawText) => {
  if (actor.role === ROLES.STAFF) throw httpError("User accounts can read messages but cannot send replies", 403);
  const text = sanitizeMessageText(rawText);
  if (!text) throw httpError("Message cannot be empty");
  if (!toId) throw httpError("Choose who to message");
  const allowed = await contactIdsFor(actor);
  if (!allowed.includes(String(toId))) throw httpError("You cannot message this person", 403);

  const doc = await ChatMessage.create({ pair: pairKey(actor._id, toId), from: actor._id, to: toId, text });
  const message = publicMessage(doc);
  emitToUser(toId, "chat:message", message);
  emitToUser(actor._id, "chat:message", message);
  return message;
};

// Marks everything the other person sent as read and tells them live.
export const markConversationRead = async (actor, withId) => {
  if (!withId) throw httpError("Choose a conversation");
  const readAt = new Date();
  const result = await ChatMessage.updateMany({ from: withId, to: actor._id, readAt: null, deletedAt: null }, { readAt });
  if (result.modifiedCount > 0) emitToUser(withId, "chat:read", { by: String(actor._id), at: readAt });
  return result.modifiedCount;
};

export const deleteMessageAsSuperAdmin = async (actor, messageId) => {
  if (actor.role !== ROLES.SUPER_ADMIN) throw httpError("Only the Super Admin can delete messages", 403);
  const message = await ChatMessage.findById(messageId);
  if (!message) throw httpError("Message not found", 404);
  if (!message.deletedAt) {
    message.deletedAt = new Date();
    message.deletedBy = actor._id;
    await message.save();
  }
  const payload = { _id: String(message._id), pair: message.pair };
  emitToUser(message.from, "chat:deleted", payload);
  emitToUser(message.to, "chat:deleted", payload);
  return message;
};

export const deleteConversationAsSuperAdmin = async (actor, firstId, secondId) => {
  if (actor.role !== ROLES.SUPER_ADMIN) throw httpError("Only the Super Admin can delete chats", 403);
  const pair = pairKey(firstId, secondId);
  const deletedAt = new Date();
  const messages = await ChatMessage.find({ pair, deletedAt: null }).select("_id from to pair").lean();
  if (!messages.length) return { pair, deleted: 0 };
  await ChatMessage.updateMany({ pair, deletedAt: null }, { $set: { deletedAt, deletedBy: actor._id } });
  const payload = { pair };
  for (const message of messages) {
    emitToUser(message.from, "chat:conversation-deleted", payload);
    emitToUser(message.to, "chat:conversation-deleted", payload);
  }
  return { pair, deleted: messages.length };
};

export { publicMessage, notifyUsers };
