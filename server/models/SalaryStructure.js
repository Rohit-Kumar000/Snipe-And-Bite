import mongoose from "mongoose";

// Salary terms for one employee. Only the Super Admin can read or change these.
const salarySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    monthlyBase: { type: Number, required: true, min: 0 },
    workingDays: { type: Number, default: 26, min: 1, max: 31 },
    dailyHours: { type: Number, default: 8, min: 1, max: 24 },
    overtimeMultiplier: { type: Number, default: 1.5, min: 1, max: 5 },
  },
  { timestamps: true }
);

export default mongoose.model("SalaryStructure", salarySchema);
