import express from "express";
import { body } from "express-validator";
import { submitContact, listMessages, updateMessageStatus, deleteMessage } from "../controllers/contactController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import { contactLimiter } from "../middleware/rateLimiter.js";
import validate from "../middleware/validate.js";

const router = express.Router();

router.post(
  "/",
  contactLimiter,
  [
    body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Please enter your name"),
    body("email").isEmail().withMessage("Please enter a valid email").normalizeEmail(),
    body("phone").optional({ values: "falsy" }).matches(/^[6-9]\d{9}$/).withMessage("Enter a valid 10 digit mobile number"),
    body("subject").trim().isLength({ min: 3, max: 120 }).withMessage("Please add a subject (3 to 120 characters)"),
    body("message").trim().isLength({ min: 10, max: 2000 }).withMessage("Message must be 10 to 2000 characters"),
  ],
  validate,
  submitContact
);

router.get("/", protect, authorize("messages.manage"), listMessages);
router.patch(
  "/:id",
  protect,
  authorize("messages.manage"),
  [body("status").isIn(["new", "read", "replied", "archived"]).withMessage("Invalid status")],
  validate,
  updateMessageStatus
);
router.delete("/:id", protect, authorize("messages.delete"), deleteMessage);

export default router;
