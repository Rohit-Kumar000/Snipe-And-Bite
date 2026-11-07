import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    rating: { type: Number, required: [true, "Rating is required"], min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

// One review per user per item.
reviewSchema.index({ user: 1, menuItem: 1 }, { unique: true });
reviewSchema.index({ menuItem: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
