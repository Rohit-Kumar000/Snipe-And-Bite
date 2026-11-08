import mongoose from "mongoose";

export const PO_STATUSES = ["draft", "ordered", "partially_received", "received", "cancelled"];

const poItemSchema = new mongoose.Schema(
  {
    stockItem: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
    name: { type: String, required: true },
    unit: { type: String, default: "pcs" },
    quantity: { type: Number, required: true, min: [0.001, "Quantity must be more than zero"] },
    unitCost: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    items: { type: [poItemSchema], validate: (v) => v.length > 0 },
    status: { type: String, enum: PO_STATUSES, default: "draft" },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    paidAt: { type: Date, default: null },
    expectedDate: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    notes: { type: String, maxlength: 300, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    history: [{ status: String, at: { type: Date, default: Date.now }, by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, _id: false }],
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ createdAt: -1 });

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);
