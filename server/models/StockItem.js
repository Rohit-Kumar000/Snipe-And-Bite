import mongoose from "mongoose";

export const STOCK_UNITS = ["kg", "g", "l", "ml", "pcs", "pack", "box", "dozen"];

// A raw material, ingredient or packaging item kept in inventory.
const stockItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Item name is required"], trim: true, maxlength: 80, unique: true },
    sku: { type: String, trim: true, uppercase: true, maxlength: 30, default: "" },
    category: { type: String, trim: true, maxlength: 40, default: "General" },
    unit: { type: String, enum: STOCK_UNITS, default: "pcs" },
    quantity: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0, min: 0 },
    // Weighted average cost per unit, updated every time stock is received.
    unitCost: { type: Number, default: 0, min: 0 },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

stockItemSchema.virtual("isLow").get(function () {
  return this.quantity <= this.reorderLevel;
});
stockItemSchema.set("toJSON", { virtuals: true });

export default mongoose.model("StockItem", stockItemSchema);
