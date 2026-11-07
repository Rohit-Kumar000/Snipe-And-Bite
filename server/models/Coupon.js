import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    description: { type: String, trim: true, maxlength: 150, default: "" },
    discountType: { type: String, enum: ["percent", "flat"], required: true },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [1, "Discount value must be at least 1"],
    },
    maxDiscount: { type: Number, default: 0, min: 0 }, // 0 means no cap (percent coupons only)
    minOrder: { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date, required: [true, "Expiry date is required"] },
    usageLimit: { type: Number, default: 0, min: 0 }, // 0 means unlimited
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 0 }, // 0 means unlimited
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

couponSchema.pre("validate", function () {
  if (this.discountType === "percent" && this.discountValue > 100) {
    this.invalidate("discountValue", "Percent discount cannot be more than 100");
  }
});

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
