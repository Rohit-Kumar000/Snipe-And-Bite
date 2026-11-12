import Category from "../models/Category.js";
import MenuItem from "../models/MenuItem.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteImage } from "../config/cloudinary.js";
import { httpError, toBool } from "../utils/helpers.js";

// Adds an itemCount to each category from real menu records, so counts always match the database.
const withCounts = async (categories, onlyAvailable) => {
  const match = onlyAvailable ? { isAvailable: true } : {};
  const rows = await MenuItem.aggregate([{ $match: match }, { $group: { _id: "$category", count: { $sum: 1 } } }]);
  const counts = new Map(rows.map((row) => [String(row._id), row.count]));
  return categories.map((category) => ({ ...category.toJSON(), itemCount: counts.get(String(category._id)) || 0 }));
};

// GET /api/categories (public, active only). itemCount counts items customers can order.
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  const list = await withCounts(categories, true);
  res.json({ success: true, count: list.length, categories: list });
});

// GET /api/categories/all (admin, includes inactive)
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  const list = await withCounts(categories, false);
  res.json({ success: true, count: list.length, categories: list });
});

// POST /api/categories (admin, multipart)
export const createCategory = asyncHandler(async (req, res) => {
  try {
    const { name, isActive } = req.body;
    const category = await Category.create({
      name,
      isActive: toBool(isActive, true),
      image: req.file ? { url: req.file.path, public_id: req.file.filename } : undefined,
    });
    res.status(201).json({ success: true, category });
  } catch (err) {
    if (req.file) await deleteImage(req.file.filename);
    throw err;
  }
});

// PUT /api/categories/:id (admin, multipart)
export const updateCategory = asyncHandler(async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) throw httpError("Category not found", 404);

    const { name, isActive } = req.body;
    if (name !== undefined) category.name = name;
    if (isActive !== undefined) category.isActive = toBool(isActive, category.isActive);

    const oldImageId = category.image?.public_id;
    if (req.file) category.image = { url: req.file.path, public_id: req.file.filename };

    await category.save();
    if (req.file) await deleteImage(oldImageId);

    res.json({ success: true, category });
  } catch (err) {
    if (req.file) await deleteImage(req.file.filename);
    throw err;
  }
});

// DELETE /api/categories/:id (admin)
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw httpError("Category not found", 404);

  const hasItems = await MenuItem.exists({ category: category._id });
  if (hasItems) throw httpError("This category has menu items. Move or delete them first");

  await deleteImage(category.image?.public_id);
  await category.deleteOne();
  res.json({ success: true, message: "Category deleted" });
});
