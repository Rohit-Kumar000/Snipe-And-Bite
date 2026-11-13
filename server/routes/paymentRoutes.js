import express from "express";
import { body } from "express-validator";
import { getPaymentConfig, createPaymentOrder, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();

router.get("/config", getPaymentConfig);

router.post(
  "/create-order",
  protect,
  [body("orderId").isMongoId().withMessage("A valid order id is required")],
  validate,
  createPaymentOrder
);

router.post(
  "/verify",
  protect,
  [
    body("razorpay_order_id").notEmpty().withMessage("razorpay_order_id is required"),
    body("razorpay_payment_id").notEmpty().withMessage("razorpay_payment_id is required"),
    body("razorpay_signature").notEmpty().withMessage("razorpay_signature is required"),
  ],
  validate,
  verifyPayment
);

// The webhook route is registered in app.js because it needs the raw request body.

export default router;
