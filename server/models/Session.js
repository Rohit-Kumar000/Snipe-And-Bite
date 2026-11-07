import mongoose from "mongoose";

// One document per signed-in device. The JWT carries the session id, so revoking a session logs that device out immediately.
const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    device: { type: String, default: "" },
    rememberMe: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revokedReason: { type: String, default: "" },
  },
  { timestamps: true }
);

// MongoDB removes expired sessions automatically one day after they expire.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export default mongoose.model("Session", sessionSchema);
