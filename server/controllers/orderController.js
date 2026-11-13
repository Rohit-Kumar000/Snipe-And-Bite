import Order, { ORDER_FLOWS, ADMIN_VISIBLE_FILTER, PAYMENT_STATUSES } from "../models/Order.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateOrderNumber from "../utils/orderNumber.js";
import streamInvoice from "../utils/generateInvoice.js";
import { calculateOrder } from "../utils/orderCalculator.js";
import { notifyOrder, notifyTeamNewOrder } from "../utils/orderNotifications.js";
import { isEmployeeRole } from "../utils/permissions.js";
import { getDownlineIds } from "../services/hierarchyService.js";
import { logAudit } from "../services/auditService.js";
import { isRazorpayConfigured, refundPayment } from "../utils/razorpay.js";
import { httpError, escapeRegex, getPagination } from "../utils/helpers.js";
import { consumeForOrder, restoreForOrder } from "../services/inventoryService.js";
import { emitToUser } from "../socket/io.js";
import { notifyUsers } from "../services/notificationService.js";

// Pushes the current status to the customer's open tabs so tracking updates without a refresh.
const pushOrderUpdate = (order) =>
  emitToUser(order.user, "order:update", { orderId: String(order._id), status: order.status, paymentStatus: order.paymentStatus, statusHistory: order.statusHistory, assignedTo: order.assignedTo });

const PHONE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^\d{6}$/;

// Validates contact, address and table details for the chosen order type.
const validateOrderDetails = ({ orderType, contactName, contactPhone, address, tableNumber }, settings) => {
  if (!ORDER_FLOWS[orderType]) throw httpError("Invalid order type");
  if (!contactName || !String(contactName).trim()) throw httpError("Contact name is required");
  if (!PHONE_REGEX.test(String(contactPhone || ""))) {
    throw httpError("Enter a valid 10 digit mobile number");
  }

  const details = {
    contact: { name: String(contactName).trim(), phone: String(contactPhone) },
    address: undefined,
    tableNumber: "",
  };

  if (orderType === "delivery") {
    if (!address?.line1 || !address?.city || !PINCODE_REGEX.test(String(address?.pincode || ""))) {
      throw httpError("A complete delivery address with a 6 digit pincode is required");
    }
    if (settings.servicePincodes.length > 0 && !settings.servicePincodes.includes(String(address.pincode))) {
      throw httpError(`Sorry, we do not deliver to pincode ${address.pincode} yet`);
    }
    details.address = {
      line1: String(address.line1).trim(),
      landmark: String(address.landmark || "").trim(),
      city: String(address.city).trim(),
      state: String(address.state || "").trim(),
      pincode: String(address.pincode),
    };
  }

  if (orderType === "dine-in") {
    if (!tableNumber || !String(tableNumber).trim()) throw httpError("Table number is required for dine-in");
    details.tableNumber = String(tableNumber).trim().slice(0, 10);
  }

  return details;
};

// Gives back loyalty points and coupon usage when an order is cancelled.
const releaseOrderResources = async (order) => {
  if (order.pointsRedeemed > 0) {
    await User.findByIdAndUpdate(order.user, { $inc: { loyaltyPoints: order.pointsRedeemed } });
  }
  if (order.couponCode) {
    await Coupon.updateOne({ code: order.couponCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
  }
};

// Cancels an order, handles the refund for paid online orders and notifies the customer.
const applyCancellation = async (order, reason) => {
  order.status = "cancelled";
  order.cancelReason = reason || "";
  order.statusHistory.push({ status: "cancelled" });

  if (order.paymentMethod === "ONLINE" && order.paymentStatus === "paid") {
    order.paymentStatus = "refund_pending";
    if (await refundPayment(order)) order.paymentStatus = "refunded";
  }

  await restoreForOrder(order);
  await order.save();
  await releaseOrderResources(order);
  notifyOrder(order, "cancelled");
  pushOrderUpdate(order);
};

// Creates the order document. The random order number is retried on a rare collision.
const createWithUniqueNumber = async (data) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await Order.create({ ...data, orderNumber: generateOrderNumber() });
    } catch (error) {
      const isNumberClash = error.code === 11000 && error.keyPattern?.orderNumber;
      if (!isNumberClash) throw error;
    }
  }
  throw httpError("Could not create the order, please try again", 500);
};

// POST /api/orders/quote (calculates the bill without creating an order)
export const quoteOrder = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();
  const { items, orderType, couponCode, redeemPoints } = req.body;
  if (!ORDER_FLOWS[orderType]) throw httpError("Invalid order type");

  const quote = await calculateOrder({
    items,
    orderType,
    couponCode,
    redeemPoints,
    user: req.user,
    settings,
    softCoupon: true,
  });
  res.json({ success: true, quote });
});

// POST /api/orders
export const createOrder = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();
  if (!settings.isOpen) throw httpError("The restaurant is currently closed. Please try again later");

  const { orderType, paymentMethod, contactName, contactPhone, address, tableNumber, note, items, couponCode, redeemPoints } = req.body;

  if (paymentMethod === "ONLINE" && !isRazorpayConfigured()) {
    throw httpError("Online payment is not available right now. Please choose Cash on Delivery");
  }

  const details = validateOrderDetails({ orderType, contactName, contactPhone, address, tableNumber }, settings);
  const calc = await calculateOrder({ items, orderType, couponCode, redeemPoints, user: req.user, settings });

  const reserved = { points: 0, coupon: "" };
  const rollback = async () => {
    if (reserved.points > 0) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { loyaltyPoints: reserved.points } });
    }
    if (reserved.coupon) {
      await Coupon.updateOne({ code: reserved.coupon, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
    }
  };

  let order;
  try {
    // Loyalty points are deducted atomically so they cannot be spent twice.
    if (calc.pointsRedeemed > 0) {
      const updated = await User.findOneAndUpdate(
        { _id: req.user._id, loyaltyPoints: { $gte: calc.pointsRedeemed } },
        { $inc: { loyaltyPoints: -calc.pointsRedeemed } }
      );
      if (!updated) throw httpError("Not enough loyalty points");
      reserved.points = calc.pointsRedeemed;
    }

    // The coupon usage counter is also incremented atomically to respect the usage limit.
    if (calc.couponCode) {
      const updated = await Coupon.findOneAndUpdate(
        {
          code: calc.couponCode,
          isActive: true,
          $or: [{ usageLimit: 0 }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }],
        },
        { $inc: { usedCount: 1 } }
      );
      if (!updated) throw httpError("This coupon is no longer available");
      reserved.coupon = calc.couponCode;
    }

    order = await createWithUniqueNumber({
      user: req.user._id,
      items: calc.lines,
      itemsTotal: calc.itemsTotal,
      discount: calc.discount,
      couponCode: calc.couponCode,
      pointsRedeemed: calc.pointsRedeemed,
      tax: calc.tax,
      deliveryCharge: calc.deliveryCharge,
      totalAmount: calc.totalAmount,
      pointsEarned: calc.pointsToEarn,
      orderType,
      tableNumber: details.tableNumber,
      contact: details.contact,
      address: details.address,
      note: note ? String(note).slice(0, 300) : "",
      paymentMethod,
      paymentStatus: "pending",
      status: "placed",
      statusHistory: [{ status: "placed" }],
    });
  } catch (error) {
    await rollback();
    throw error;
  }

  // Cash orders are confirmed to the customer immediately. Online orders are notified after payment.
  if (paymentMethod === "COD") {
    notifyOrder(order, "placed");
    notifyTeamNewOrder(order);
  }

  res.status(201).json({ success: true, order });
});

// GET /api/orders/my
export const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 10, 50);
  const filter = { user: req.user._id };

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), orders });
});

// Loads an order that the current user is allowed to see (owner or admin).
const findAccessibleOrder = async (req) => {
  const order = await Order.findById(req.params.id).populate("user", "name email phone");
  if (!order) throw httpError("Order not found", 404);

  const ownerId = String(order.user?._id || order.user);
  if (!isEmployeeRole(req.user.role) && ownerId !== String(req.user._id)) {
    throw httpError("Order not found", 404);
  }
  return order;
};

// GET /api/orders/:id
export const getOrder = asyncHandler(async (req, res) => {
  const order = await findAccessibleOrder(req);
  if (req.user.role === "STAFF" && String(order.assignedTo || "") !== String(req.user._id)) throw httpError("Order not found", 404);
  res.json({ success: true, order });
});

// PUT /api/orders/:id/cancel (customer, only before preparation starts)
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw httpError("Order not found", 404);

  if (!["placed", "confirmed"].includes(order.status)) {
    throw httpError("This order can no longer be cancelled because it is already being prepared");
  }

  await applyCancellation(order, String(req.body.reason || "Cancelled by customer").slice(0, 200));
  res.json({ success: true, order });
});

// GET /api/orders/:id/invoice
export const getInvoice = asyncHandler(async (req, res) => {
  const order = await findAccessibleOrder(req);
  if (req.user.role === "STAFF" && String(order.assignedTo || "") !== String(req.user._id)) throw httpError("Order not found", 404);
  if (order.status === "cancelled") throw httpError("An invoice is not available for cancelled orders");
  const settings = await Settings.getSettings();
  streamInvoice(order, settings, res);
});

// GET /api/orders (admin) ?status=&type=&search=&date=&page=&limit=
export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, type, search, date } = req.query;
  const { page, limit, skip } = getPagination(req.query, 15, 50);

  const conditions = [ADMIN_VISIBLE_FILTER];
  if (req.user.role === "STAFF") conditions.push({ assignedTo: req.user._id });
  if (status) conditions.push({ status });
  if (type) conditions.push({ orderType: type });
  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), "i");
    conditions.push({ $or: [{ orderNumber: rx }, { "contact.phone": rx }, { "contact.name": rx }] });
  }
  if (date) {
    const from = new Date(`${date}T00:00:00+05:30`);
    if (!Number.isNaN(from.getTime())) {
      conditions.push({ createdAt: { $gte: from, $lt: new Date(from.getTime() + 24 * 60 * 60 * 1000) } });
    }
  }
  const filter = { $and: conditions };

  const [orders, total, countRows] = await Promise.all([
    Order.find(filter).populate("user", "name email phone").populate("assignedTo", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
    Order.aggregate([{ $match: req.user.role === "STAFF" ? { $and: [ADMIN_VISIBLE_FILTER, { assignedTo: req.user._id }] } : ADMIN_VISIBLE_FILTER }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const counts = Object.fromEntries(countRows.map((r) => [r._id, r.count]));
  res.json({ success: true, total, page, pages: Math.ceil(total / limit), counts, orders });
});

export const assignOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw httpError("Order not found", 404);
  const staff = await User.findOne({ _id: req.body.staffId, role: "STAFF", isBlocked: false });
  if (!staff) throw httpError("Choose an active staff account", 400);
  if (req.user.role !== "SUPER_ADMIN") {
    const downline = await getDownlineIds(req.user._id);
    if (!downline.includes(String(staff._id))) throw httpError("You can assign orders only within your team", 403);
  }
  if (String(order.assignedTo || "") === String(staff._id)) throw httpError("This order is already assigned to that person");
  order.assignedTo = staff._id;
  order.assignmentHistory.push({ assignedTo: staff._id, assignedBy: req.user._id });
  await order.save();
  const note = { type: "order_assigned", title: `Order ${order.orderNumber} assigned to you`, body: `${order.orderType} order, assigned by ${req.user.name}`, link: `/admin/orders/${order._id}` };
  await notifyUsers([staff._id], note);
  emitToUser(staff._id, "order:assigned", { orderId: String(order._id), orderNumber: order.orderNumber });
  pushOrderUpdate(order);
  await logAudit(req, { action: "ORDER_ASSIGNED", resourceType: "Order", resourceId: order._id, targetUser: staff._id, summary: `Assigned ${order.orderNumber} to ${staff.name}` });
  res.json({ success: true, order: await order.populate([{ path: "assignedTo", select: "name" }, { path: "assignmentHistory.assignedTo", select: "name" }, { path: "assignmentHistory.assignedBy", select: "name" }]) });
});

// PUT /api/orders/:id/status (admin)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw httpError("Order not found", 404);
  if (req.user.role === "STAFF" && String(order.assignedTo || "") !== String(req.user._id)) throw httpError("Order not found", 404);

  if (["delivered", "cancelled"].includes(order.status)) {
    throw httpError(`This order is already ${order.status}`);
  }

  if (status === "cancelled") {
    await applyCancellation(order, String(reason || "Cancelled by restaurant").slice(0, 200));
    await logAudit(req, { action: "ORDER_CANCELLED", resourceType: "Order", resourceId: order._id, summary: `Cancelled order ${order.orderNumber}`, meta: { reason } });
    return res.json({ success: true, order });
  }

  const flow = ORDER_FLOWS[order.orderType];
  const from = flow.indexOf(order.status);
  const to = flow.indexOf(status);
  if (to === -1) throw httpError(`"${status}" is not a valid status for a ${order.orderType} order`);
  if (to <= from) throw httpError("An order cannot move backwards");
  if (order.paymentMethod === "ONLINE" && order.paymentStatus !== "paid") {
    throw httpError("Online payment has not been completed for this order");
  }

  const previousStatus = order.status;
  order.status = status;
  order.statusHistory.push({ status });

  if (status === "delivered") {
    if (order.paymentMethod === "COD") order.paymentStatus = "paid";
    if (!order.pointsAwarded && order.pointsEarned > 0) {
      await User.findByIdAndUpdate(order.user, { $inc: { loyaltyPoints: order.pointsEarned } });
      order.pointsAwarded = true;
    }
  }

  await consumeForOrder(order); // deducts ingredient stock once, when the order moves past "placed"
  await order.save();
  pushOrderUpdate(order);
  await logAudit(req, { action: "ORDER_STATUS_CHANGED", resourceType: "Order", resourceId: order._id, summary: `Order ${order.orderNumber}: ${previousStatus} to ${status}`, meta: { from: previousStatus, to: status } });
  notifyOrder(order, status);
  res.json({ success: true, order });
});

// PUT /api/orders/:id/payment-status (admin, marks a refund as completed)
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  if (!PAYMENT_STATUSES.includes(paymentStatus)) throw httpError("Invalid payment status");

  const order = await Order.findById(req.params.id);
  if (!order) throw httpError("Order not found", 404);

  if (paymentStatus === "refunded" && order.paymentStatus !== "refund_pending") {
    throw httpError("Only orders with a pending refund can be marked as refunded");
  }
  if (paymentStatus === "paid" && order.paymentMethod !== "COD") {
    throw httpError("Only cash orders can be marked as paid manually");
  }
  if (!["refunded", "paid"].includes(paymentStatus)) {
    throw httpError("This payment status cannot be set manually");
  }

  const previous = order.paymentStatus;
  order.paymentStatus = paymentStatus;
  await order.save();
  await logAudit(req, {
    action: paymentStatus === "refunded" ? "REFUND_COMPLETED" : "PAYMENT_MARKED_PAID",
    resourceType: "Order", resourceId: order._id,
    summary: `Order ${order.orderNumber}: payment ${previous} to ${paymentStatus}`,
    meta: { from: previous, to: paymentStatus, amount: order.totalAmount },
  });
  res.json({ success: true, order });
});

// GET /api/orders/:id/assignments  who the order was assigned to, by whom, and when
export const getAssignmentHistory = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .select("orderNumber assignedTo assignmentHistory")
    .populate("assignedTo", "name")
    .populate("assignmentHistory.assignedTo", "name role")
    .populate("assignmentHistory.assignedBy", "name role");
  if (!order) throw httpError("Order not found", 404);
  res.json({ success: true, current: order.assignedTo, history: order.assignmentHistory });
});
