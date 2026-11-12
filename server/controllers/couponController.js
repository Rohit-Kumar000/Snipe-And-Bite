import Coupon from "../models/Coupon.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError, toBool } from "../utils/helpers.js";
import { priceCartItems, evaluateCoupon } from "../utils/orderCalculator.js";

const FIELDS = ["code", "description", "discountType", "discountValue", "maxDiscount", "minOrder", "expiryDate", "usageLimit", "perUserLimit"];

const pickFields = (body) => {
  const data = {};
  for (const field of FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (body.isActive !== undefined) data.isActive = toBool(body.isActive, true);
  return data;
};

// GET /api/coupons/public (running coupons for the offers page)
export const getPublicCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({
    isActive: true,
    expiryDate: { $gt: new Date() },
    $or: [{ usageLimit: 0 }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }],
  })
    .select("code description discountType discountValue maxDiscount minOrder expiryDate")
    .sort({ expiryDate: 1 });
  res.json({ success: true, coupons });
});

// POST /api/coupons/apply (logged in user, checks a coupon against the cart)
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code, items } = req.body;
  const { itemsTotal } = await priceCartItems(items);
  const { coupon, discount } = await evaluateCoupon({ code, itemsTotal, userId: req.user._id });
  res.json({
    success: true,
    discount,
    itemsTotal,
    coupon: { code: coupon.code, description: coupon.description },
  });
});

// GET /api/coupons (admin)
export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, coupons });
});

// POST /api/coupons (admin)
export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(pickFields(req.body));
  res.status(201).json({ success: true, coupon });
});

// PUT /api/coupons/:id (admin)
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw httpError("Coupon not found", 404);
  coupon.set(pickFields(req.body));
  await coupon.save();
  res.json({ success: true, coupon });
});

// DELETE /api/coupons/:id (admin)
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw httpError("Coupon not found", 404);
  await coupon.deleteOne();
  res.json({ success: true, message: "Coupon deleted" });
});
