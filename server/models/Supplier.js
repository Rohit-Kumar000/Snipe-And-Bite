import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Supplier name is required"], trim: true, maxlength: 80, unique: true },
    contactName: { type: String, trim: true, maxlength: 60, default: "" },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    email: { type: String, trim: true, lowercase: true, maxlength: 80, default: "" },
    address: { type: String, trim: true, maxlength: 250, default: "" },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 20, default: "" },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Supplier", supplierSchema);
