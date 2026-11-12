import MenuItem from "../models/MenuItem.js";
import Category from "../models/Category.js";
import Combo from "../models/Combo.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteImage } from "../config/cloudinary.js";
import { logAudit } from "../services/auditService.js";
import { toBool, escapeRegex, parseJSON, httpError, getPagination } from "../utils/helpers.js";

const parseNullable = (value, type) => {
  if (value === undefined) return undefined;
  if (value === "" || value === "null" || value === null) return null;
  return type === "date" ? new Date(value) : Number(value);
};

const validateDeal = (price, dealPrice, dealEndsAt) => {
  if (dealPrice == null && dealEndsAt == null) return;
  if (dealPrice == null || dealEndsAt == null) {
    throw httpError("A deal needs both a deal price and an end time");
  }
  if (Number.isNaN(dealPrice) || Number.isNaN(dealEndsAt.getTime())) {
    throw httpError("Invalid deal price or deal end time");
  }
  if (dealPrice >= price) throw httpError("Deal price must be less than the normal price");
};

const parseAddOns = (value) => {
  const addOns = parseJSON(value, "addOns");
  if (addOns === undefined) return undefined;
  if (!Array.isArray(addOns)) throw httpError("addOns must be an array");
  return addOns;
};

// GET /api/menu?category=&veg=&search=&sort=&bestseller=&available=&page=&limit=
export const getMenuItems = asyncHandler(async (req, res) => {
  const { category, veg, search, sort, bestseller, available } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (veg === "true") filter.isVeg = true;
  if (veg === "false") filter.isVeg = false;
  if (bestseller === "true") filter.isBestseller = true;
  if (available === "true") filter.isAvailable = true;
  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), "i");
    // Matches the dish name, its description, its add-ons or its category name.
    const matchingCategories = await Category.find({ name: rx }).select("_id").lean();
    filter.$or = [{ name: rx }, { description: rx }, { "addOns.name": rx }];
    if (matchingCategories.length) filter.$or.push({ category: { $in: matchingCategories.map((c) => c._id) } });
  }

  const sortMap = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { avgRating: -1 },
    newest: { createdAt: -1 },
  };
  const sortBy = sortMap[sort] || { isBestseller: -1, createdAt: -1 };
  const { page, limit, skip } = getPagination(req.query, 12, 100);

  const [items, total] = await Promise.all([
    MenuItem.find(filter).populate("category", "name slug").sort(sortBy).skip(skip).limit(limit),
    MenuItem.countDocuments(filter),
  ]);

  res.json({ success: true, count: items.length, total, page, pages: Math.ceil(total / limit), items });
});

// GET /api/menu/deals (flash deals that are running now)
export const getDeals = asyncHandler(async (req, res) => {
  const items = await MenuItem.find({
    isAvailable: true,
    dealPrice: { $ne: null },
    dealEndsAt: { $gt: new Date() },
  })
    .populate("category", "name slug")
    .sort({ dealEndsAt: 1 });

  res.json({ success: true, count: items.length, items });
});

// GET /api/menu/:id
export const getMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id).populate("category", "name slug");
  if (!item) throw httpError("Menu item not found", 404);
  res.json({ success: true, item });
});

// POST /api/menu (admin, multipart)
// Accepts a JSON array or a comma/newline separated list. Returns undefined when the field was not sent.
const parseList = (value) => {
  if (value === undefined) return undefined;
  let list = value;
  if (typeof value === "string") {
    try { list = JSON.parse(value); } catch { list = value.split(/[\n,]/); }
  }
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((v) => String(v).trim().slice(0, 60)).filter(Boolean))].slice(0, 30);
};

export const createMenuItem = asyncHandler(async (req, res) => {
  try {
    if (!req.file) throw httpError("Item image is required");

    const { name, description, price, category, isVeg, isAvailable, isBestseller, addOns, dealPrice, dealEndsAt, ingredients } = req.body;

    const cat = await Category.findById(category);
    if (!cat) throw httpError("Category not found");

    const deal = parseNullable(dealPrice, "number") ?? null;
    const dealEnd = parseNullable(dealEndsAt, "date") ?? null;
    validateDeal(Number(price), deal, dealEnd);

    const item = await MenuItem.create({
      name,
      description,
      price: Number(price),
      category,
      isVeg: toBool(isVeg, true),
      isAvailable: toBool(isAvailable, true),
      isBestseller: toBool(isBestseller, false),
      addOns: parseAddOns(addOns),
      ingredients: parseList(ingredients) || [],
      dealPrice: deal,
      dealEndsAt: dealEnd,
      image: { url: req.file.path, public_id: req.file.filename },
    });

    res.status(201).json({ success: true, item });
  } catch (err) {
    if (req.file) await deleteImage(req.file.filename);
    throw err;
  }
});

// PUT /api/menu/:id (admin, multipart)
export const updateMenuItem = asyncHandler(async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) throw httpError("Menu item not found", 404);

    const { name, description, price, category, isVeg, isAvailable, isBestseller, addOns, dealPrice, dealEndsAt, ingredients } = req.body;

    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    const previousPrice = item.price;
    if (price !== undefined) item.price = Number(price);
    if (category !== undefined) {
      const cat = await Category.findById(category);
      if (!cat) throw httpError("Category not found");
      item.category = category;
    }
    if (isVeg !== undefined) item.isVeg = toBool(isVeg, item.isVeg);
    if (isAvailable !== undefined) item.isAvailable = toBool(isAvailable, item.isAvailable);
    if (isBestseller !== undefined) item.isBestseller = toBool(isBestseller, item.isBestseller);

    const parsedList = parseList(ingredients);
    if (parsedList !== undefined) item.ingredients = parsedList;

    const parsedAddOns = parseAddOns(addOns);
    if (parsedAddOns !== undefined) item.addOns = parsedAddOns;

    const deal = parseNullable(dealPrice, "number");
    const dealEnd = parseNullable(dealEndsAt, "date");
    if (deal !== undefined) item.dealPrice = deal;
    if (dealEnd !== undefined) item.dealEndsAt = dealEnd;
    validateDeal(item.price, item.dealPrice, item.dealEndsAt);

    const oldImageId = item.image?.public_id;
    if (req.file) item.image = { url: req.file.path, public_id: req.file.filename };

    await item.save();
    if (req.file) await deleteImage(oldImageId);

    await logAudit(req, { action: "PRODUCT_UPDATED", resourceType: "MenuItem", resourceId: item._id, summary: `Updated product ${item.name}` });
    if (item.price !== previousPrice) {
      await logAudit(req, {
        action: "PRICE_CHANGED", resourceType: "MenuItem", resourceId: item._id,
        summary: `${item.name}: price ${previousPrice} to ${item.price}`, meta: { from: previousPrice, to: item.price },
      });
    }

    res.json({ success: true, item });
  } catch (err) {
    if (req.file) await deleteImage(req.file.filename);
    throw err;
  }
});

// PATCH /api/menu/:id/availability (admin, switches an item between available and sold out)
export const toggleAvailability = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw httpError("Menu item not found", 404);
  item.isAvailable = !item.isAvailable;
  await item.save();
  res.json({ success: true, item });
});

// DELETE /api/menu/:id (admin)
export const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw httpError("Menu item not found", 404);

  const inCombo = await Combo.exists({ "items.menuItem": item._id });
  if (inCombo) throw httpError("This item is part of a combo. Remove it from the combo first");

  await deleteImage(item.image?.public_id);
  await item.deleteOne();
  res.json({ success: true, message: "Menu item deleted" });
});

// POST /api/menu/:id/gallery  adds one extra photo (field name "image")
export const addGalleryImage = asyncHandler(async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) throw httpError("Menu item not found", 404);
    if (!req.file) throw httpError("Choose a photo to upload");
    if (item.gallery.length >= 5) throw httpError("A product can have at most 5 extra photos");
    item.gallery.push({ url: req.file.path, public_id: req.file.filename });
    await item.save();
    res.status(201).json({ success: true, gallery: item.gallery });
  } catch (err) {
    if (req.file) await deleteImage(req.file.filename);
    throw err;
  }
});

// DELETE /api/menu/:id/gallery/:index
export const removeGalleryImage = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw httpError("Menu item not found", 404);
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0 || index >= item.gallery.length) throw httpError("Photo not found", 404);
  const [removed] = item.gallery.splice(index, 1);
  await item.save();
  await deleteImage(removed.public_id);
  res.json({ success: true, gallery: item.gallery });
});
