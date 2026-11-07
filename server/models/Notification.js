import mongoose from "mongoose";

// One notification per recipient, so read state is tracked per person.
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true }, // new_order, contact_message, security, account
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, default: "", maxlength: 300 },
    link: { type: String, default: "" },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
// Notifications older than 90 days are removed automatically.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model("Notification", notificationSchema);
