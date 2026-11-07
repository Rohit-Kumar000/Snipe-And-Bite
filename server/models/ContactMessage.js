import mongoose from "mongoose";

// Messages sent through the public Contact form.
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["new", "read", "replied", "archived"], default: "new", index: true },
    emailedToOwner: { type: Boolean, default: false },
    ip: { type: String, default: "" },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

export default mongoose.model("ContactMessage", contactMessageSchema);
