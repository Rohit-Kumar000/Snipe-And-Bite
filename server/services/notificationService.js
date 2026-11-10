import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Creates one notification for each recipient. Never throws.
export const notifyUsers = async (userIds, { type, title, body = "", link = "" }) => {
  try {
    const unique = [...new Set(userIds.map(String))];
    if (unique.length === 0) return;
    await Notification.insertMany(unique.map((user) => ({ user, type, title, body, link })));
  } catch (error) {
    console.error(`Notification failed: ${error.message}`);
  }
};

// Notifies every active employee that holds one of the given roles.
export const notifyRoles = async (roles, payload) => {
  try {
    const users = await User.find({ role: { $in: roles }, isBlocked: false }).select("_id").lean();
    await notifyUsers(users.map((u) => u._id), payload);
  } catch (error) {
    console.error(`Role notification failed: ${error.message}`);
  }
};
