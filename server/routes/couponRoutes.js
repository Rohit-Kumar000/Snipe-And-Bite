import express from "express";
import { body } from "express-validator";
import {
  getPublicCoupons, applyCoupon, getCoupons, createCoupon, updateCoupon, deleteCoupon,
} from "../controllers/couponController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();

const couponRules = [
  body("code").trim().notEmpty().withMessage("Coupon code is required"),
  body("discountType").isIn(["percent", "flat"]).withMessage("Discount type must be percent or flat"),
  body("discountValue").isFloat({ min: 1 }).withMessage("Discount value must be at least 1"),
  body("expiryDate").isISO8601().withMessage("A valid expiry date is required"),
];

// Same checks as create, but every field is optional so a partial update (for example only isActive) still works.
const updateRules = [
  body("code").optional().trim().notEmpty().withMessage("Coupon code cannot be empty"),
  body("discountType").optional().isIn(["percent", "flat"]).withMessage("Discount type must be percent or flat"),
  body("discountValue").optional().isFloat({ min: 1 }).withMessage("Discount value must be at least 1"),
  body("expiryDate").optional().isISO8601().withMessage("A valid expiry date is required"),
  body("maxDiscount").optional().isFloat({ min: 0 }).withMessage("Max discount cannot be negative"),
  body("minOrder").optional().isFloat({ min: 0 }).withMessage("Minimum order cannot be negative"),
  body("usageLimit").optional().isInt({ min: 0 }).withMessage("Usage limit cannot be negative"),
  body("perUserLimit").optional().isInt({ min: 0 }).withMessage("Per user limit cannot be negative"),
];

router.get("/public", getPublicCoupons);
router.post(
  "/apply",
  protect,
  [
    body("code").trim().notEmpty().withMessage("Enter a coupon code"),
    body("items").isArray({ min: 1 }).withMessage("Your cart is empty"),
  ],
  validate,
  applyCoupon
);

router.get("/", protect, authorize("coupons.manage"), getCoupons);
router.post("/", protect, authorize("coupons.manage"), couponRules, validate, createCoupon);
router.put("/:id", protect, authorize("coupons.manage"), updateRules, validate, updateCoupon);
router.delete("/:id", protect, authorize("coupons.manage"), deleteCoupon);

export default router;
