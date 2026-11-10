import mongoose from "mongoose";
import MenuItem from "../models/MenuItem.js";
import Combo from "../models/Combo.js";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import { httpError, round2 } from "./helpers.js";

const MAX_QTY = 20;
const MAX_LINES = 50;

// Prices every cart line from the database. Prices sent by the client are never trusted.
// Input line shape: { type: "menu" | "combo", id, qty, addOns: ["Extra Cheese"] }
export const priceCartItems = async (cartItems) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw httpError("Your cart is empty");
  }
  if (cartItems.length > MAX_LINES) throw httpError("Too many items in the cart");

  const menuIds = [];
  const comboIds = [];
  for (const line of cartItems) {
    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw httpError(`Quantity must be between 1 and ${MAX_QTY}`);
    }
    if (!mongoose.isValidObjectId(line.id)) throw httpError("Invalid item in the cart");
    if (line.type === "combo") comboIds.push(line.id);
    else if (line.type === "menu") menuIds.push(line.id);
    else throw httpError("Invalid item type in the cart");
  }

  const [menuDocs, comboDocs] = await Promise.all([
    MenuItem.find({ _id: { $in: menuIds } }),
    Combo.find({ _id: { $in: comboIds } }).populate("items.menuItem", "name isAvailable"),
  ]);
  const menuMap = new Map(menuDocs.map((d) => [String(d._id), d]));
  const comboMap = new Map(comboDocs.map((d) => [String(d._id), d]));

  const lines = cartItems.map((line) => {
    const qty = Number(line.qty);

    if (line.type === "combo") {
      const combo = comboMap.get(String(line.id));
      if (!combo) throw httpError("A combo in your cart no longer exists");
      const missingItem = combo.items.some((i) => !i.menuItem || !i.menuItem.isAvailable);
      if (!combo.isAvailable || missingItem) {
        throw httpError(`${combo.name} is currently unavailable`);
      }
      return {
        kind: "combo",
        combo: combo._id,
        name: combo.name,
        image: combo.image?.url || "",
        price: combo.price,
        qty,
        addOns: [],
        lineTotal: round2(combo.price * qty),
      };
    }

    const item = menuMap.get(String(line.id));
    if (!item) throw httpError("An item in your cart no longer exists");
    if (!item.isAvailable) throw httpError(`${item.name} is currently unavailable`);

    const requested = [...new Set(Array.isArray(line.addOns) ? line.addOns : [])];
    const addOns = requested.map((name) => {
      const found = item.addOns.find((a) => a.name === name);
      if (!found) throw httpError(`Add-on "${name}" is not available for ${item.name}`);
      return { name: found.name, price: found.price };
    });
    const addOnTotal = addOns.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = item.currentPrice;

    return {
      kind: "menu",
      menuItem: item._id,
      name: item.name,
      image: item.image?.url || "",
      isVeg: item.isVeg,
      price: unitPrice,
      qty,
      addOns,
      lineTotal: round2((unitPrice + addOnTotal) * qty),
    };
  });

  const itemsTotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  return { lines, itemsTotal };
};

// Validates a coupon for the given cart total and returns the discount amount.
export const evaluateCoupon = async ({ code, itemsTotal, userId }) => {
  const coupon = await Coupon.findOne({ code: String(code || "").trim().toUpperCase() });
  if (!coupon || !coupon.isActive) throw httpError("Invalid coupon code");
  if (coupon.expiryDate < new Date()) throw httpError("This coupon has expired");
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw httpError("This coupon has reached its usage limit");
  }
  if (itemsTotal < coupon.minOrder) {
    throw httpError(`Add items worth Rs. ${coupon.minOrder} or more to use this coupon`);
  }
  if (coupon.perUserLimit > 0 && userId) {
    const used = await Order.countDocuments({
      user: userId,
      couponCode: coupon.code,
      status: { $ne: "cancelled" },
    });
    if (used >= coupon.perUserLimit) throw httpError("You have already used this coupon");
  }

  let discount =
    coupon.discountType === "percent"
      ? (itemsTotal * coupon.discountValue) / 100
      : coupon.discountValue;
  if (coupon.discountType === "percent" && coupon.maxDiscount > 0) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  discount = round2(Math.min(discount, itemsTotal));
  return { coupon, discount };
};

// Calculates the complete bill. With softCoupon, an invalid coupon is reported instead of thrown.
export const calculateOrder = async ({
  items,
  orderType,
  couponCode,
  redeemPoints,
  user,
  settings,
  softCoupon = false,
}) => {
  const { lines, itemsTotal } = await priceCartItems(items);

  if (itemsTotal < settings.minOrderAmount) {
    throw httpError(`Minimum order amount is Rs. ${settings.minOrderAmount}`);
  }

  let discount = 0;
  let appliedCoupon = null;
  let couponError = "";
  if (couponCode) {
    try {
      const result = await evaluateCoupon({ code: couponCode, itemsTotal, userId: user._id });
      discount = result.discount;
      appliedCoupon = result.coupon;
    } catch (error) {
      if (!softCoupon) throw error;
      couponError = error.message;
    }
  }

  const afterDiscount = round2(itemsTotal - discount);

  // 1 loyalty point equals Rs. 1. At most half of the bill can be paid with points.
  const requestedPoints = Math.floor(Number(redeemPoints) || 0);
  const pointsRedeemed =
    requestedPoints > 0
      ? Math.max(0, Math.min(requestedPoints, user.loyaltyPoints, Math.floor(afterDiscount * 0.5)))
      : 0;

  const taxable = round2(afterDiscount - pointsRedeemed);
  const tax = round2((taxable * settings.taxPercent) / 100);
  const freeDelivery = settings.freeDeliveryAbove > 0 && itemsTotal >= settings.freeDeliveryAbove;
  const deliveryCharge = orderType === "delivery" && !freeDelivery ? settings.deliveryCharge : 0;
  const totalAmount = round2(taxable + tax + deliveryCharge);
  const pointsToEarn = Math.floor((afterDiscount * settings.loyaltyPercent) / 100);

  return {
    lines,
    itemsTotal,
    discount,
    couponCode: appliedCoupon ? appliedCoupon.code : "",
    couponError,
    pointsRedeemed,
    tax,
    deliveryCharge,
    totalAmount,
    pointsToEarn,
  };
};
