import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/", getSettings);
router.put("/", protect, authorize("settings.manage"), updateSettings);

export default router;
