import User from "../models/User.js";
import { EMPLOYEE_ROLES, collectDownlineIds } from "../utils/permissions.js";

// Ids of every employee below the given user in the reporting tree (as strings).
export const getDownlineIds = async (userId) => {
  const employees = await User.find({ role: { $in: EMPLOYEE_ROLES } }).select("_id reportsTo").lean();
  return collectDownlineIds(employees, userId);
};
