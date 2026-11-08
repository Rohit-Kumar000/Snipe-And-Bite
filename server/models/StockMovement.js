import mongoose from "mongoose";

export const MOVEMENT_TYPES = ["purchase", "sale", "sale_reversal", "adjustment", "waste", "opening"];

// Append-only history of every stock change. quantityChange is signed.
const stockMovementSchema = new mongoose.Schema(
  {
    stockItem: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true, index: true },
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    quantityChange: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    reference: { type: String, default: "" }, // e.g. "PurchaseOrder:<id>" or "Order:<id>"
    note: { type: String, default: "", maxlength: 200 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({ createdAt: -1 });

export default mongoose.model("StockMovement", stockMovementSchema);
