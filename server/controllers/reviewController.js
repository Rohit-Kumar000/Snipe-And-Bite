import mongoose from "mongoose";
import Review from "../models/Review.js";
import MenuItem from "../models/MenuItem.js";
import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError, getPagination } from "../utils/helpers.js";
import { logAudit } from "../services/auditService.js";

// Recalculates the average rating and review count stored on the menu item.
const refreshItemRating = async (menuItemId) => {
  const [stats] = await Review.aggregate([
    { $match: { menuItem: new mongoose.Types.ObjectId(String(menuItemId)) } },
    { $group: { _id: "$menuItem", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await MenuItem.findByIdAndUpdate(menuItemId, {
    avgRating: stats ? Math.round(stats.avg * 10) / 10 : 0,
    numReviews: stats ? stats.count : 0,
  });
};

// POST /api/reviews (a customer can review only items from their delivered orders)
export const addReview = asyncHandler(async (req, res) => {
  const { menuItem, rating, comment } = req.body;

  const item = await MenuItem.findById(menuItem);
  if (!item) throw httpError("Menu item not found", 404);

  const purchased = await Order.exists({
    user: req.user._id,
    status: "delivered",
    "items.menuItem": item._id,
  });
  if (!purchased) throw httpError("You can review an item only after receiving it in an order");

  const review = await Review.findOneAndUpdate(
    { user: req.user._id, menuItem: item._id },
    { rating: Number(rating), comment: comment || "" },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
  );

  await refreshItemRating(item._id);
  res.status(201).json({ success: true, review });
});

// GET /api/reviews/item/:id (public)
export const getItemReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 10, 50);
  const filter = { menuItem: req.params.id };

  const [reviews, total] = await Promise.all([
    Review.find(filter).populate("user", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), reviews });
});

// GET /api/reviews (admin)
export const getAllReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 15, 50);

  const [reviews, total] = await Promise.all([
    Review.find()
      .populate("user", "name email")
      .populate("menuItem", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), reviews });
});

// DELETE /api/reviews/:id (admin)
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw httpError("Review not found", 404);
  const itemId = review.menuItem;
  await review.deleteOne();
  await refreshItemRating(itemId);
  await logAudit(req, { action: "REVIEW_DELETED", resourceType: "Review", resourceId: review._id, summary: "Deleted a customer review" });
  res.json({ success: true, message: "Review deleted" });
});

// GET /api/reviews/public (public) latest written reviews from verified buyers, with names shortened for privacy
export const getPublicReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 9, 30);
  const filter = { comment: { $ne: "" } };
  if (req.query.minRating) filter.rating = { $gte: Math.min(Math.max(Number(req.query.minRating) || 1, 1), 5) };

  const [reviews, total] = await Promise.all([
    Review.find(filter).populate("user", "name").populate("menuItem", "name").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);

  // Only the first name and the first letter of the last name are ever shown publicly.
  const shortName = (name = "Customer") => {
    const [first, ...rest] = name.trim().split(/\s+/);
    return rest.length > 0 ? `${first} ${rest[rest.length - 1].charAt(0).toUpperCase()}.` : first;
  };

  res.json({
    success: true, total, page, pages: Math.ceil(total / limit),
    reviews: reviews.map((r) => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      author: shortName(r.user?.name),
      dish: r.menuItem?.name || "",
      createdAt: r.createdAt,
    })),
  });
});

// GET /api/reviews/summary (public) real totals and rating distribution
export const getReviewSummary = asyncHandler(async (req, res) => {
  const rows = await Review.aggregate([{ $group: { _id: "$rating", count: { $sum: 1 } } }]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;
  for (const row of rows) {
    distribution[row._id] = row.count;
    total += row.count;
    sum += row._id * row.count;
  }
  res.json({ success: true, total, average: total ? Math.round((sum / total) * 10) / 10 : 0, distribution });
});
