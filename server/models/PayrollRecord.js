import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    baseSalary: Number,
    daysWorked: Number,
    totalHours: Number,
    overtimeHours: Number,
    overtimePay: Number,
    unpaidLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDeduction: Number,
    bonuses: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    grossPay: Number,
    netPay: Number,
    note: { type: String, maxlength: 200, default: "" },
    status: { type: String, enum: ["draft", "paid"], default: "draft" },
    paidAt: { type: Date, default: null },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

payrollSchema.index({ user: 1, month: 1 }, { unique: true });

export default mongoose.model("PayrollRecord", payrollSchema);
