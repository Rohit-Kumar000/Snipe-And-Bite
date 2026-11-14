import ContactMessage from "../models/ContactMessage.js";
import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendEmail, { isEmailConfigured } from "../utils/sendEmail.js";
import { contactOwnerEmail } from "../utils/emailTemplates.js";
import { escapeRegex, getPagination, httpError } from "../utils/helpers.js";
import { getIp, logAudit } from "../services/auditService.js";
import { notifyRoles } from "../services/notificationService.js";

// Address that receives a copy of every contact form message.
const ownerEmail = () => process.env.CONTACT_NOTIFY_EMAIL || process.env.EMAIL_USER || "";

// POST /api/contact (public)
export const submitContact = asyncHandler(async (req, res) => {
  // Bots tend to fill hidden fields. A filled honeypot is accepted silently and discarded.
  if (req.body.website) return res.status(201).json({ success: true, received: true, emailed: false });

  const { name, email, phone, subject, message } = req.body;
  const saved = await ContactMessage.create({ name, email, phone, subject, message, ip: getIp(req) });

  let emailed = false;
  const to = ownerEmail();
  if (to && isEmailConfigured()) {
    const settings = await Settings.getSettings();
    const { subject: mailSubject, html } = contactOwnerEmail({ message: saved, settings });
    emailed = await sendEmail({ to, subject: mailSubject, html, replyTo: saved.email });
    if (emailed) await ContactMessage.updateOne({ _id: saved._id }, { emailedToOwner: true });
  }

  await notifyRoles(["SUPER_ADMIN", "ADMIN", "MANAGER"], {
    type: "contact_message",
    title: `New message from ${saved.name}`,
    body: saved.subject,
    link: "/admin/messages",
  });

  // The message is always stored, so it is never lost even when email is not configured.
  res.status(201).json({ success: true, received: true, emailed });
});

// GET /api/contact (messages.manage) ?status=&search=&page=
export const listMessages = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const { page, limit, skip } = getPagination(req.query, 15, 50);

  const filter = {};
  if (status) filter.status = status;
  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), "i");
    filter.$or = [{ name: rx }, { email: rx }, { subject: rx }, { message: rx }];
  }

  const [messages, total, counts] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("handledBy", "name"),
    ContactMessage.countDocuments(filter),
    ContactMessage.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  res.json({
    success: true, total, page, pages: Math.ceil(total / limit), messages,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
    emailConfigured: isEmailConfigured(),
  });
});

// PATCH /api/contact/:id
export const updateMessageStatus = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);
  if (!message) throw httpError("Message not found", 404);
  message.status = req.body.status;
  message.handledBy = req.user._id;
  await message.save();
  res.json({ success: true, message });
});

// DELETE /api/contact/:id
export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);
  if (!message) throw httpError("Message not found", 404);
  await message.deleteOne();
  await logAudit(req, { action: "CONTACT_MESSAGE_DELETED", resourceType: "ContactMessage", resourceId: message._id, summary: `Deleted message from ${message.email}` });
  res.json({ success: true, message: "Message deleted" });
});
