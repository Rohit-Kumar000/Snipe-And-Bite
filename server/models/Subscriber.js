import mongoose from "mongoose";

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    isActive: { type: Boolean, default: true },
    subscribedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Subscriber", subscriberSchema);
