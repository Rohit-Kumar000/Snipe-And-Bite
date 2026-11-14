import Notification from "../models/Notification.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getPagination } from "../utils/helpers.js";

// GET /api/notifications
export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 15, 50);
  const filter = { user: req.user._id };
  const [notifications, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, readAt: { $exists: false } }),
  ]);
  res.json({ success: true, total, unread, page, pages: Math.ceil(total / limit), notifications });
});

// PATCH /api/notifications/:id/read
export const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id, readAt: { $exists: false } }, { readAt: new Date() });
  res.json({ success: true });
});

// PATCH /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, readAt: { $exists: false } }, { readAt: new Date() });
  res.json({ success: true });
});
