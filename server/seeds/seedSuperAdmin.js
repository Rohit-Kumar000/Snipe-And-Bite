import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import { ROLES } from "../utils/permissions.js";
import { validatePasswordStrength } from "../utils/sessionPolicy.js";

// Creates the one and only Super Admin from SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD.
// Run it once on the server: npm run seed:super-admin
// If the email already belongs to an account (for example the old admin), that account is promoted instead.
// The password is read from the environment only. It is never stored in the source code.
const seedSuperAdmin = async () => {
  let exitCode = 0;
  try {
    const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME?.trim();

    if (!name || !email || !password) throw new Error("SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required");
    if (password.length < 12) throw new Error("SUPER_ADMIN_PASSWORD must be at least 12 characters");
    const weak = validatePasswordStrength(password);
    if (weak) throw new Error(weak);

    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME || "SnipeAndBite" });
    await User.syncIndexes();

    const existingSuperAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
    if (existingSuperAdmin) {
      console.log(`A Super Admin already exists (${existingSuperAdmin.email}). Nothing was changed.`);
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      existing.role = ROLES.SUPER_ADMIN;
      existing.name = name;
      existing.password = password;
      existing.reportsTo = null;
      existing.isBlocked = false;
      existing.mustChangePassword = false;
      await existing.save();
      console.log(`Existing account promoted to Super Admin: ${email}`);
    } else {
      await User.create({ name, email, password, role: ROLES.SUPER_ADMIN, designation: "Owner" });
      console.log(`Super Admin created: ${email}`);
    }
    console.log("Next step: sign in and complete the mandatory two-factor setup.");
    console.log("Remove SUPER_ADMIN_PASSWORD from your environment now.");
  } catch (error) {
    console.error(`Seed error: ${error.message}`);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit(exitCode);
  }
};

seedSuperAdmin();
