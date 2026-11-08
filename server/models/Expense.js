import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = ["rent", "utilities", "marketing", "maintenance", "supplies", "transport", "licenses", "software", "other"];
export const PAYMENT_METHODS = ["cash", "upi", "card", "bank_transfer", "cheque", "other"];

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: 100 },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    amount: { type: Number, required: true, min: [0.01, "Amount must be more than zero"] },
    date: { type: Date, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cash" },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

export default mongoose.model("Expense", expenseSchema);
