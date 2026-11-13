import express from "express";
import { body } from "express-validator";
import {
  quoteOrder, createOrder, getMyOrders, getOrder, cancelOrder, getInvoice,
  getAllOrders, updateOrderStatus, updatePaymentStatus,
  assignOrder, getAssignmentHistory,
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import validate from "../middleware/validate.js";
import { ORDER_STATUSES } from "../models/Order.js";

const router = express.Router();

router.use(protect);

const itemsRule = body("items").isArray({ min: 1 }).withMessage("Your cart is empty");
const typeRule = body("orderType")
  .isIn(["delivery", "pickup", "dine-in"])
  .withMessage("Order type must be delivery, pickup or dine-in");

router.post("/quote", [itemsRule, typeRule], validate, quoteOrder);

router.post(
  "/",
  [
    itemsRule,
    typeRule,
    body("paymentMethod").isIn(["COD", "ONLINE"]).withMessage("Payment method must be COD or ONLINE"),
    body("contactName").trim().notEmpty().withMessage("Contact name is required"),
    body("contactPhone").matches(/^[6-9]\d{9}$/).withMessage("Enter a valid 10 digit mobile number"),
  ],
  validate,
  createOrder
);

router.get("/my", getMyOrders);
router.get("/", authorize("orders.view"), getAllOrders);
router.put("/:id/assign", authorize("orders.assign"), [body("staffId").isMongoId().withMessage("Choose a team member")], validate, assignOrder);
router.get("/:id/assignments", authorize("orders.assign"), getAssignmentHistory);
router.get("/:id", getOrder);
router.get("/:id/invoice", getInvoice);
router.put("/:id/cancel", cancelOrder);

router.put(
  "/:id/status",
  authorize("orders.update"),
  [body("status").isIn(ORDER_STATUSES).withMessage("Invalid order status")],
  validate,
  updateOrderStatus
);
router.put("/:id/payment-status", authorize("payments.manage"), updatePaymentStatus);

export default router;
