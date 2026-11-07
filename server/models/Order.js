import mongoose from "mongoose";

// Allowed status progression for each order type.
export const ORDER_FLOWS = {
  delivery: ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"],
  pickup: ["placed", "confirmed", "preparing", "ready", "delivered"],
  "dine-in": ["placed", "confirmed", "preparing", "ready", "delivered"],
};

export const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refund_pending", "refunded"];

// Online orders that were never paid should not appear in the admin panel or reports.
export const ADMIN_VISIBLE_FILTER = {
  $or: [
    { paymentMethod: "COD" },
    { paymentStatus: { $in: ["paid", "refund_pending", "refunded"] } },
  ],
};

const orderItemSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["menu", "combo"], required: true },
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
    combo: { type: mongoose.Schema.Types.ObjectId, ref: "Combo" },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    isVeg: { type: Boolean },
    price: { type: Number, required: true }, // unit price at the time of the order
    qty: { type: Number, required: true, min: 1 },
    addOns: [{ name: String, price: Number }],
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },

    itemsTotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: "" },
    pointsRedeemed: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    orderType: { type: String, enum: Object.keys(ORDER_FLOWS), required: true },
    tableNumber: { type: String, default: "" },
    contact: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
    address: {
      line1: String,
      landmark: String,
      city: String,
      state: String,
      pincode: String,
    },
    note: { type: String, default: "", maxlength: 300 },

    paymentMethod: { type: String, enum: ["COD", "ONLINE"], required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },

    status: { type: String, enum: ORDER_STATUSES, default: "placed" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    statusHistory: [
      {
        status: { type: String, enum: ORDER_STATUSES },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    cancelReason: { type: String, default: "" },
    // Every assignment and reassignment is kept, so the team can see who handled the order.
    assignmentHistory: [
      {
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    // True once ingredient stock has been deducted for this order.
    stockDeducted: { type: Boolean, default: false },

    pointsEarned: { type: Number, default: 0 },
    pointsAwarded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ razorpayOrderId: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
