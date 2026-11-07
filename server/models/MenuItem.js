import mongoose from "mongoose";
import { slugify } from "../utils/helpers.js";

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      maxlength: 80,
    },
    slug: { type: String, index: true },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [1, "Price must be at least 1"],
    },
    image: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    isBestseller: { type: Boolean, default: false },
    addOns: [
      {
        name: { type: String, required: true, trim: true, maxlength: 40 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    // "Snipe the Deal" flash offer
    dealPrice: { type: Number, default: null, min: 0 },
    dealEndsAt: { type: Date, default: null },
    // What the dish contains, shown to customers. Separate from costing.ingredients, which are stock quantities.
    ingredients: { type: [{ type: String, trim: true, maxlength: 60 }], default: [] },
    // Extra photos shown beside the main image on the product page.
    gallery: { type: [{ url: String, public_id: String, _id: false }], default: [], validate: [(v) => v.length <= 5, "A product can have at most 5 extra photos"] },
    // Cost of making one unit. Ingredient costs come from the live inventory unit cost.
    costing: {
      purchaseCost: { type: Number, default: 0, min: 0 },
      packagingCost: { type: Number, default: 0, min: 0 },
      extraCost: { type: Number, default: 0, min: 0 },
      ingredients: [
        {
          stockItem: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
          qty: { type: Number, required: true, min: 0 },
          _id: false,
        },
      ],
    },
    avgRating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

menuItemSchema.index({ category: 1, isAvailable: 1 });

menuItemSchema.pre("validate", function () {
  if (this.name && (this.isModified("name") || !this.slug)) {
    this.slug = `${slugify(this.name)}-${Math.random().toString(36).slice(2, 6)}`;
  }
});

// True while the flash deal is running. It becomes false automatically when the deal expires.
menuItemSchema.virtual("isDealActive").get(function () {
  return (
    this.dealPrice != null &&
    this.dealEndsAt != null &&
    this.dealEndsAt > new Date() &&
    this.dealPrice < this.price
  );
});

// The price a customer pays right now.
menuItemSchema.virtual("currentPrice").get(function () {
  return this.isDealActive ? this.dealPrice : this.price;
});

const MenuItem = mongoose.model("MenuItem", menuItemSchema);
export default MenuItem;
