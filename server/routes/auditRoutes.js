import express from "express";
import { listAuditLogs } from "../controllers/auditController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("audit.view"), listAuditLogs);

export default router;
