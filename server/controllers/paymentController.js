import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import { notifyOrder, notifyTeamNewOrder } from "../utils/orderNotifications.js";
import {
  isRazorpayConfigured,
  getRazorpay,
  verifyPaymentSignature,
  verifyWebhookSignature,
  refundPayment,
} from "../utils/razorpay.js";
import { httpError } from "../utils/helpers.js";

// Marks an order as paid. Safe to call more than once (the verify call and the webhook both use it).
export const markOrderPaid = async (order, paymentId) => {
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") return order;

  order.razorpayPaymentId = paymentId || order.razorpayPaymentId;

  // The customer cancelled while the payment was being captured, so the money goes back.
  if (order.status === "cancelled") {
    order.paymentStatus = "refund_pending";
    if (await refundPayment(order)) order.paymentStatus = "refunded";
    await order.save();
    return order;
  }

  order.paymentStatus = "paid";
  await order.save();
  notifyOrder(order, "placed");
  notifyTeamNewOrder(order);
  return order;
};

// GET /api/payment/config
export const getPaymentConfig = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    enabled: isRazorpayConfigured(),
    keyId: isRazorpayConfigured() ? process.env.RAZORPAY_KEY_ID : "",
  });
});

// POST /api/payment/create-order { orderId }
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.body.orderId, user: req.user._id });
  if (!order) throw httpError("Order not found", 404);
  if (order.paymentMethod !== "ONLINE") throw httpError("This order is not an online payment order");
  if (order.paymentStatus === "paid") throw httpError("This order is already paid");
  if (order.status === "cancelled") throw httpError("This order was cancelled");

  const razorpay = await getRazorpay();
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(order.totalAmount * 100), // amount in paise
    currency: "INR",
    receipt: order.orderNumber,
    notes: { orderId: String(order._id) },
  });

  order.razorpayOrderId = razorpayOrder.id;
  if (order.paymentStatus === "failed") order.paymentStatus = "pending";
  await order.save();

  res.json({
    success: true,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    orderId: order._id,
  });
});

// POST /api/payment/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;

  const order = await Order.findOne({ razorpayOrderId: orderId, user: req.user._id });
  if (!order) throw httpError("Order not found", 404);

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    throw httpError("Payment verification failed");
  }

  await markOrderPaid(order, paymentId);
  res.json({ success: true, order });
});

// POST /api/payment/webhook (called by Razorpay, uses the raw request body)
export const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body; // Buffer, because the route uses express.raw

    if (!Buffer.isBuffer(rawBody) || !verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    const payment = event.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id || event.payload?.order?.entity?.id;

    if (razorpayOrderId) {
      const order = await Order.findOne({ razorpayOrderId });
      if (order) {
        if (event.event === "payment.captured" || event.event === "order.paid") {
          await markOrderPaid(order, payment?.id);
        } else if (event.event === "payment.failed" && order.paymentStatus === "pending") {
          order.paymentStatus = "failed";
          await order.save();
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error(`Webhook error: ${error.message}`);
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};
