import express from "express";
import { body, param } from "express-validator";
import { subscribe, listSubscribers, removeSubscriber } from "../controllers/newsletterController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import { contactLimiter } from "../middleware/rateLimiter.js";
import validate from "../middleware/validate.js";

const router = express.Router();
router.post("/", contactLimiter, [body("email").isEmail().withMessage("Please enter a valid email").normalizeEmail()], validate, subscribe);
router.get("/", protect, authorize("newsletter.manage"), listSubscribers);
router.delete("/:id", protect, authorize("newsletter.manage"), [param("id").isMongoId()], validate, removeSubscriber);
export default router;
