import bcrypt from "bcryptjs";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hasPermission, isEmployeeRole } from "../utils/permissions.js";
import { httpError } from "../utils/helpers.js";

// Allows the request when the user's role holds at least one of the listed permissions.
// Must run after protect. Every permission check happens on the server.
export const authorize = (...permissions) => (req, res, next) => {
  if (req.user && permissions.some((permission) => hasPermission(req.user.role, permission))) return next();
  res.status(403);
  next(new Error("You do not have permission to do this"));
};

// Allows any employee role (Super Admin, Admin, Manager, Staff).
export const employeeOnly = (req, res, next) => {
  if (req.user && isEmployeeRole(req.user.role)) return next();
  res.status(403);
  next(new Error("Employee access only"));
};

// Re-authentication for sensitive actions: the caller must resend their current password.
export const reauthenticate = asyncHandler(async (req, res, next) => {
  const password = req.body?.adminPassword;
  if (!password) throw httpError("Please confirm your password to continue", 401);
  const me = await User.findById(req.user._id).select("+password");
  if (!(await bcrypt.compare(String(password), me.password))) {
    throw httpError("Your password is incorrect", 401);
  }
  delete req.body.adminPassword;
  next();
});
