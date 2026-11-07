import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "../utils/permissions.js";

const addressSchema = new mongoose.Schema({
  label: { type: String, default: "Home", trim: true, maxlength: 30 },
  line1: { type: String, required: [true, "Address line is required"], trim: true, maxlength: 200 },
  landmark: { type: String, trim: true, maxlength: 100, default: "" },
  city: { type: String, required: [true, "City is required"], trim: true, maxlength: 60 },
  state: { type: String, trim: true, maxlength: 60, default: "" },
  pincode: {
    type: String,
    required: [true, "Pincode is required"],
    trim: true,
    match: [/^\d{6}$/, "Pincode must be 6 digits"],
  },
  isDefault: { type: Boolean, default: false },
});

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // never returned in API responses unless explicitly requested
    },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
    designation: { type: String, trim: true, maxlength: 60, default: "" },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    avatar: { type: imageSchema, default: () => ({}) },
    cover: { type: imageSchema, default: () => ({}) },
    addresses: [addressSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" }],
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    // Suspension flag. The legacy name is kept so existing customer data keeps working.
    isBlocked: { type: Boolean, default: false },
    suspendedReason: { type: String, trim: true, maxlength: 200, default: "" },
    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLoginAt: { type: Date },
    lastSeenAt: { type: Date },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secretEnc: { type: String, select: false },
      pendingSecretEnc: { type: String, select: false },
      recoveryCodeHashes: { type: [String], select: false, default: [] },
      enabledAt: { type: Date },
    },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpire: { type: Date, select: false },
    // Social sign-in links. A provider account is linked to one user only.
    oauth: [{ provider: { type: String, enum: ["google", "github", "facebook", "linkedin"] }, providerId: { type: String }, _id: false }],
    oauthJti: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  { timestamps: true }
);

// Only one Super Admin account may exist.
userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: ROLES.SUPER_ADMIN } });
userSchema.index({ reportsTo: 1 });

// Hash the password before saving whenever it has been changed.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

// The Super Admin account can never be deleted through the application.
const blockSuperAdminDeletion = async function () {
  const target = await this.model.findOne(this.getFilter()).select("role").lean();
  if (target?.role === ROLES.SUPER_ADMIN) throw new Error("The Super Admin account cannot be deleted");
};
userSchema.pre("deleteOne", { document: false, query: true }, blockSuperAdminDeletion);
userSchema.pre("findOneAndDelete", blockSuperAdminDeletion);
userSchema.pre("deleteMany", async function () {
  const hit = await this.model.exists({ ...this.getFilter(), role: ROLES.SUPER_ADMIN });
  if (hit) throw new Error("The Super Admin account cannot be deleted");
});

// Compares a plain text password with the stored hash.
userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
