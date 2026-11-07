import mongoose from "mongoose";
import { slugify } from "../utils/helpers.js";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      maxlength: 40,
    },
    slug: { type: String, unique: true },
    image: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.pre("validate", function () {
  if (this.name && (this.isModified("name") || !this.slug)) {
    this.slug = slugify(this.name);
  }
});

const Category = mongoose.model("Category", categorySchema);
export default Category;
