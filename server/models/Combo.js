import mongoose from "mongoose";

const comboSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Combo name is required"],
      trim: true,
      maxlength: 80,
    },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    image: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    items: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MenuItem",
          required: true,
        },
        qty: { type: Number, required: true, min: 1, default: 1 },
      },
    ],
    price: {
      type: Number,
      required: [true, "Combo price is required"],
      min: [1, "Price must be at least 1"],
    },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Total price if every item were bought separately (only meaningful when menuItem is populated).
comboSchema.virtual("originalPrice").get(function () {
  return this.items.reduce((sum, i) => sum + (i.menuItem?.price || 0) * i.qty, 0);
});

const Combo = mongoose.model("Combo", comboSchema);
export default Combo;
