import ChatMessage from "../models/ChatMessage.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/helpers.js";
import { pairKey, canMonitorConversation } from "../utils/chatPolicy.js";
import { ROLES } from "../utils/permissions.js";
import { contactIdsFor, sendMessage, markConversationRead, deleteMessageAsSuperAdmin, deleteConversationAsSuperAdmin, publicMessage } from "../services/chatService.js";
import { isOnline } from "../socket/io.js";
import { logAudit } from "../services/auditService.js";

// GET /api/chat/contacts  people the caller may chat with, with unread counts and the last message
export const getContacts = asyncHandler(async (req, res) => {
  const ids = await contactIdsFor(req.user);
  const users = await User.find({ _id: { $in: ids } }).select("name role designation avatar lastSeenAt").lean();
  const me = req.user._id;

  const [unreadRows, lastRows] = await Promise.all([
    ChatMessage.aggregate([{ $match: { to: me, readAt: null, deletedAt: null } }, { $group: { _id: "$from", count: { $sum: 1 } } }]),
    ChatMessage.aggregate([
      { $match: { deletedAt: null, $or: [{ from: me }, { to: me }] } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$pair", last: { $first: "$$ROOT" } } },
    ]),
  ]);
  const unread = new Map(unreadRows.map((r) => [String(r._id), r.count]));
  const last = new Map(lastRows.map((r) => [r._id, r.last]));

  const contacts = users.map((u) => {
    const lastMessage = last.get(pairKey(me, u._id));
    return {
      _id: String(u._id), name: u.name, role: u.role, designation: u.designation, avatar: u.avatar?.url || "",
      online: isOnline(u._id), lastSeenAt: u.lastSeenAt || null, unread: unread.get(String(u._id)) || 0,
      lastMessage: lastMessage ? { ...publicMessage(lastMessage) } : null,
    };
  }).sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0) || a.name.localeCompare(b.name));

  res.json({ success: true, contacts, totalUnread: contacts.reduce((n, c) => n + c.unread, 0) });
});

// GET /api/chat/messages/:userId?before=<iso>&limit=
export const getMessages = asyncHandler(async (req, res) => {
  const allowed = await contactIdsFor(req.user);
  if (!allowed.includes(req.params.userId)) throw httpError("You cannot open this conversation", 403);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 40, 1), 100);
  const filter = { pair: pairKey(req.user._id, req.params.userId), deletedAt: null };
  if (req.query.before && !Number.isNaN(Date.parse(req.query.before))) filter.createdAt = { $lt: new Date(req.query.before) };
  const rows = await ChatMessage.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ success: true, messages: rows.reverse().map(publicMessage), hasMore: rows.length === limit });
});

// POST /api/chat/messages/:userId  (REST fallback when the socket is not connected)
export const postMessage = asyncHandler(async (req, res) => {
  const message = await sendMessage(req.user, req.params.userId, req.body.text);
  res.status(201).json({ success: true, message });
});

// PUT /api/chat/read/:userId  clears the unread dot for that conversation
export const readConversation = asyncHandler(async (req, res) => {
  const allowed = await contactIdsFor(req.user);
  if (!allowed.includes(req.params.userId)) throw httpError("You cannot open this conversation", 403);
  const count = await markConversationRead(req.user, req.params.userId);
  res.json({ success: true, marked: count });
});

// DELETE /api/chat/messages/:id  Super Admin only (route also requires the chat.delete permission)
export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await deleteMessageAsSuperAdmin(req.user, req.params.id);
  await logAudit(req, { action: "CHAT_MESSAGE_DELETED", resourceType: "ChatMessage", resourceId: message._id, summary: "Deleted a chat message" });
  res.json({ success: true });
});

export const deleteConversation = asyncHandler(async (req, res) => {
  const result = await deleteConversationAsSuperAdmin(req.user, req.params.a, req.params.b);
  await logAudit(req, { action: "CHAT_CONVERSATION_DELETED", resourceType: "ChatMessage", summary: "Deleted a chat conversation", meta: result });
  res.json({ success: true, ...result });
});

// GET /api/chat/monitor  conversations between other people that the caller may oversee (read only)
export const listMonitoredConversations = asyncHandler(async (req, res) => {
  const me = req.user;
  const match = { deletedAt: null, from: { $ne: me._id }, to: { $ne: me._id } };
  if (me.role !== ROLES.SUPER_ADMIN) {
    const superAdminIds = await User.find({ role: ROLES.SUPER_ADMIN }).distinct("_id");
    match.from = { $nin: [me._id, ...superAdminIds] };
    match.to = { $nin: [me._id, ...superAdminIds] };
  }
  const rows = await ChatMessage.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$pair", last: { $first: "$$ROOT" }, count: { $sum: 1 } } },
    { $sort: { "last.createdAt": -1 } },
    { $limit: 200 },
  ]);
  const ids = [...new Set(rows.flatMap((r) => [String(r.last.from), String(r.last.to)]))];
  const users = await User.find({ _id: { $in: ids } }).select("name role avatar").lean();
  const byId = new Map(users.map((u) => [String(u._id), { _id: String(u._id), name: u.name, role: u.role, avatar: u.avatar?.url || "" }]));
  const conversations = rows
    .map((r) => ({ pair: r._id, count: r.count, a: byId.get(String(r.last.from)), b: byId.get(String(r.last.to)), lastMessage: publicMessage(r.last) }))
    .filter((c) => c.a && c.b && canMonitorConversation(me, c.a, c.b));
  res.json({ success: true, conversations });
});

// GET /api/chat/monitor/:a/:b  full history of one conversation. Only the Super Admin sees deleted message text.
export const monitorConversation = asyncHandler(async (req, res) => {
  const { a, b } = req.params;
  const [userA, userB] = await Promise.all([User.findById(a).select("name role avatar").lean(), User.findById(b).select("name role avatar").lean()]);
  if (!userA || !userB || !canMonitorConversation(req.user, userA, userB)) throw httpError("You cannot view this conversation", 403);
  const rows = await ChatMessage.find({ pair: pairKey(a, b) }).sort({ createdAt: 1 }).limit(500).lean();
  await logAudit(req, { action: "CHAT_AUDIT_VIEWED", resourceType: "ChatMessage", summary: `Viewed the conversation between ${userA.name} and ${userB.name}` });
  const isSuper = req.user.role === ROLES.SUPER_ADMIN;
  const person = (u) => ({ _id: String(u._id), name: u.name, role: u.role, avatar: u.avatar?.url || "" });
  res.json({
    success: true,
    people: [person(userA), person(userB)],
    messages: rows.map((m) => ({ ...publicMessage(m), ...(isSuper && m.deletedAt ? { text: m.text } : {}) })),
  });
});
