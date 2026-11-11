import User from "../models/User.js";
import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError, escapeRegex, getPagination } from "../utils/helpers.js";
import { publicUser } from "../utils/userSerializer.js";
import { ROLES } from "../utils/permissions.js";
import { revokeAllSessions } from "../services/sessionService.js";
import { logAudit } from "../services/auditService.js";
import { deleteImage } from "../config/cloudinary.js";
import MenuItem from "../models/MenuItem.js";

export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: "wishlist", populate: { path: "category", select: "name" } });
  res.json({ success: true, items: user.wishlist || [] });
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  if (!itemId.match(/^[a-f\d]{24}$/i)) throw httpError("Menu item not found", 404);
  const item = await MenuItem.findOne({ _id: itemId });
  if (!item) throw httpError("Menu item not found", 404);
  const hasItem = req.user.wishlist.some((id) => String(id) === itemId);
  if (hasItem) req.user.wishlist.pull(itemId);
  else req.user.wishlist.addToSet(itemId);
  await req.user.save();
  res.json({ success: true, saved: !hasItem, itemId });
});

// PUT /api/users/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const changed = [];
  if (name !== undefined && name !== req.user.name) { req.user.name = name; changed.push("name"); }
  if (phone !== undefined && phone !== req.user.phone) { req.user.phone = phone; changed.push("phone"); }
  await req.user.save();
  if (changed.length > 0) {
    await logAudit(req, { action: "PROFILE_UPDATED", resourceType: "User", resourceId: req.user._id, summary: `Updated ${changed.join(", ")}` });
  }
  res.json({ success: true, user: publicUser(req.user) });
});

// Stores an uploaded image on the user and removes the previous one from Cloudinary.
const saveImage = (field) =>
  asyncHandler(async (req, res) => {
    if (!req.file) throw httpError("Please choose an image");
    const previousId = req.user[field]?.publicId;
    req.user[field] = { url: req.file.path, publicId: req.file.filename };
    await req.user.save();
    await deleteImage(previousId);
    await logAudit(req, { action: `${field.toUpperCase()}_UPDATED`, resourceType: "User", resourceId: req.user._id, summary: `Changed ${field} image` });
    res.json({ success: true, user: publicUser(req.user) });
  });

const removeImage = (field) =>
  asyncHandler(async (req, res) => {
    const previousId = req.user[field]?.publicId;
    req.user[field] = { url: "", publicId: "" };
    await req.user.save();
    await deleteImage(previousId);
    await logAudit(req, { action: `${field.toUpperCase()}_REMOVED`, resourceType: "User", resourceId: req.user._id, summary: `Removed ${field} image` });
    res.json({ success: true, user: publicUser(req.user) });
  });

export const uploadAvatar = saveImage("avatar");
export const uploadCover = saveImage("cover");
export const removeAvatar = removeImage("avatar");
export const removeCover = removeImage("cover");

// PUT /api/users/password (signs the account out of every other device)
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    throw httpError("Current password is incorrect");
  }
  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  await revokeAllSessions(user._id, { exceptSessionId: req.sessionId, reason: "password_changed" });
  await logAudit(req, { action: "PASSWORD_CHANGED", resourceType: "User", resourceId: user._id, summary: "Password changed" });
  res.json({ success: true, message: "Password updated successfully", user: publicUser(user) });
});

// POST /api/users/address
export const addAddress = asyncHandler(async (req, res) => {
  if (req.user.addresses.length >= 5) {
    throw httpError("You can save up to 5 addresses");
  }
  const { label, line1, landmark, city, state, pincode, isDefault } = req.body;
  const makeDefault = Boolean(isDefault) || req.user.addresses.length === 0;
  if (makeDefault) req.user.addresses.forEach((a) => (a.isDefault = false));

  req.user.addresses.push({ label, line1, landmark, city, state, pincode, isDefault: makeDefault });
  await req.user.save();
  res.status(201).json({ success: true, user: publicUser(req.user) });
});

// PUT /api/users/address/:addressId/default
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) throw httpError("Address not found", 404);
  req.user.addresses.forEach((a) => (a.isDefault = String(a._id) === String(address._id)));
  await req.user.save();
  res.json({ success: true, user: publicUser(req.user) });
});

// DELETE /api/users/address/:addressId
export const deleteAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) throw httpError("Address not found", 404);
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && req.user.addresses.length > 0) req.user.addresses[0].isDefault = true;
  await req.user.save();
  res.json({ success: true, user: publicUser(req.user) });
});

// GET /api/users (customers.view) with order count and total spent
export const getUsers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const { page, limit, skip } = getPagination(req.query, 15, 50);

  const filter = { role: ROLES.CUSTOMER };
  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const stats = await Order.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) }, status: { $ne: "cancelled" } } },
    { $group: { _id: "$user", orders: { $sum: 1 }, spent: { $sum: "$totalAmount" } } },
  ]);
  const statsMap = new Map(stats.map((s) => [String(s._id), s]));

  const customers = users.map((u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    isBlocked: u.isBlocked,
    loyaltyPoints: u.loyaltyPoints,
    createdAt: u.createdAt,
    orders: statsMap.get(String(u._id))?.orders || 0,
    spent: statsMap.get(String(u._id))?.spent || 0,
  }));

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), customers });
});

// PUT /api/users/:id/block (customers.block) toggles a customer's suspension
export const toggleBlock = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError("User not found", 404);
  if (user.role !== ROLES.CUSTOMER) throw httpError("Employee accounts are managed from the Team page");

  user.isBlocked = !user.isBlocked;
  await user.save();
  if (user.isBlocked) await revokeAllSessions(user._id, { reason: "suspended" });
  await logAudit(req, {
    action: user.isBlocked ? "CUSTOMER_SUSPENDED" : "CUSTOMER_REACTIVATED",
    resourceType: "User",
    resourceId: user._id,
    targetUser: user._id,
    summary: `${user.isBlocked ? "Suspended" : "Reactivated"} customer ${user.email}`,
  });
  res.json({ success: true, isBlocked: user.isBlocked });
});
