import AuditLog from "../models/AuditLog.js";

// Client IP as seen behind a proxy (trust proxy is enabled in server.js).
export const getIp = (req) => req?.ip || req?.socket?.remoteAddress || "";

// Writes an audit record. It never throws, so a logging problem cannot break the user's action.
export const logAudit = async (req, { actor, action, resourceType = "", resourceId = "", targetUser = null, summary = "", meta = {} }) => {
  try {
    const who = actor || req?.user || null;
    await AuditLog.create({
      actor: who?._id || null,
      actorName: who?.name || "",
      actorRole: who?.role || "",
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : "",
      targetUser: targetUser ? targetUser._id || targetUser : null,
      summary: String(summary).slice(0, 300),
      meta,
      ip: getIp(req),
      userAgent: String(req?.headers?.["user-agent"] || "").slice(0, 300),
    });
  } catch (error) {
    console.error(`Audit log failed: ${error.message}`);
  }
};
