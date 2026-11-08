import mongoose from "mongoose";

// One private message between two employees. Deleted messages stay in the database
// (deletedAt/deletedBy) so the Super Admin keeps a full record, but are hidden from normal views.
const chatMessageSchema = new mongoose.Schema(
  {
    pair: { type: String, required: true, index: true }, // sorted "idA:idB"
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 2000 },
    readAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

chatMessageSchema.index({ pair: 1, createdAt: -1 });
chatMessageSchema.index({ to: 1, readAt: 1 });

export default mongoose.model("ChatMessage", chatMessageSchema);
