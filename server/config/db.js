import mongoose from "mongoose";
import "../models/User.js";

// Older versions stored the roles "user" and "admin". They are renamed once, safely and repeatably.
// The native collection is used so schema validation does not reject the old values.
const migrateLegacyRoles = async () => {
  const users = mongoose.connection.collection("users");
  const customers = await users.updateMany({ role: "user" }, { $set: { role: "CUSTOMER" } });
  const admins = await users.updateMany({ role: "admin" }, { $set: { role: "ADMIN" } });
  if (customers.modifiedCount || admins.modifiedCount) {
    console.log(`Role migration: ${customers.modifiedCount} customers, ${admins.modifiedCount} admins updated`);
  }
};

// Connects to MongoDB. The process exits if the connection fails.
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME || "SnipeAndBite" });
    console.log("MongoDB connected");
    await migrateLegacyRoles();
    await mongoose.model("User").syncIndexes();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
