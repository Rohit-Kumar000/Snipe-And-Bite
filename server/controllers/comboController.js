import Combo from "../models/Combo.js";
import MenuItem from "../models/MenuItem.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteImage } from "../config/cloudinary.js";
import { toBool, parseJSON, httpError } from "../utils/helpers.js";

const populateItems = {
  path: "items.menuItem",
  select: "name image price isVeg isAvailable",
};

// Parses and validates the items field: '[{"menuItem":"<id>","qty":2}]'
const parseItems = async (value) => {
  const items = parseJSON(value, "items");
  if (items === undefined) return undefined;
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError("A combo needs at least one item");
  }
  for (const i of items) {
    if (!i.menuItem || !Number.isInteger(Number(i.qty)) || Number(i.qty) < 1) {
      throw httpError("Each combo item needs a menuItem and a qty of 1 or more");
    }
  }

  const ids = [...new Set(items.map((i) => String(i.menuItem)))];
  const existing = await MenuItem.find({ _id: { $in: ids } }).select("_id");
  const existingIds = existing.map((m) => String(m._id));
  const missing = ids.filter((id) => !existingIds.includes(id));
  if (missing.length) throw httpError(`Menu item not found: ${missing.join(", ")}`);

  return items.map((i) => ({ menuItem: i.menuItem, qty: Number(i.qty) }));
};

// GET /api/combos
export const getCombos = asyncHandler(async (req, res) => {
  const combos = await Combo.find().populate(populateItems).sort({ createdAt: -1 });
  res.json({ success: true, count: combos.length, combos });
});

// GET /api/combos/:id
export const getCombo = asyncHandler(async (req, res) => {
  const combo = await Combo.findById(req.params.id).populate(populateItems);
  if (!combo) throw httpError("Combo not found", 404);
  res.json({ success: true, combo });
});

// POST /api/combos (admin, multipart)
export const createCombo = asyncHandler(async (req, res) => {
  try {
    if (!req.file) throw httpError("Combo image is required");

    const { name, description, price, items, isAvailable } = req.body;
    const parsedItems = await parseItems(items);
    if (!parsedItems) throw httpError("A combo needs at least one item");

    const combo = await Combo.create({
      name,
      description,
      price: Number(price),
      items: parsedItems,
      isAvailable: toBool(isAvailable, true),
      image: { url: req.file.path, public_id: req.file.filename },
    });

    await combo.populate(populateItems);
    res.status(201).json({ success: true, combo });
  } catch (err) {
    if (req.file) await deleteImage(req.file.filename);
    throw err;
  }
});

// PUT /api/combos/:id (admin, multipart)
export const updateCombo = asyncHandler(async (req, res) => {
  try {
    const combo = await Combo.findById(req.params.id);
    if (!combo) throw httpError("Combo not found", 404);

    const { name, description, price, items, isAvailable } = req.body;
    if (name !== undefined) combo.name = name;
    if (description !== undefined) combo.description = description;
    if (price !== undefined) combo.price = Number(price);
    if (isAvailable !== undefined) combo.isAvailable = toBool(isAvailable, combo.isAvailable);

    const parsedItems = await parseItems(items);
    if (parsedItems) combo.items = parsedItems;

    const oldImageId = combo.image?.public_id;
    if (req.file) combo.image = { url: req.file.path, public_id: req.file.filename };

    await combo.save();
    if (req.file) await deleteImage(oldImageId);

    await combo.populate(populateItems);
    res.json({ success: true, combo });
  } catch (err) {
    if (req.file) await deleteImage(req.file.filename);
    throw err;
  }
});

// DELETE /api/combos/:id (admin)
export const deleteCombo = asyncHandler(async (req, res) => {
  const combo = await Combo.findById(req.params.id);
  if (!combo) throw httpError("Combo not found", 404);
  await deleteImage(combo.image?.public_id);
  await combo.deleteOne();
  res.json({ success: true, message: "Combo deleted" });
});
