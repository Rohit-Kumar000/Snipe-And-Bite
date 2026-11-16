import express from "express";
import { getReport } from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";

const router = express.Router();
router.use(protect, authorize("reports.view"));
router.get("/:type", getReport);

export default router;
