import express from "express";
import { getStats, getSalesChart, getTopItems } from "../controllers/dashboardController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(protect, authorize("dashboard.view"));

router.get("/stats", getStats);
router.get("/sales-chart", getSalesChart);
router.get("/top-items", getTopItems);

export default router;
