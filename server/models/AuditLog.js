import mongoose from "mongoose";

// Append-only record of sensitive actions. Updates and deletes are blocked at the model level.
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorName: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, default: "" },
    resourceId: { type: String, default: "" },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    summary: { type: String, default: "", maxlength: 300 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

const immutable = () => {
  throw new Error("Audit logs are append-only and cannot be modified or deleted");
};
for (const hook of [
  "updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace",
  "deleteOne", "deleteMany", "findOneAndDelete", "replaceOne",
]) {
  auditLogSchema.pre(hook, immutable);
}
auditLogSchema.pre("save", function () {
  if (!this.isNew) immutable();
});

export default mongoose.model("AuditLog", auditLogSchema);
