import Banner from "../models/Banner.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteImage } from "../config/cloudinary.js";
import { httpError, toBool } from "../utils/helpers.js";

// GET /api/banners (public, active only)
export const getBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
  res.json({ success: true, banners });
});

// GET /api/banners/all (admin)
export const getAllBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
  res.json({ success: true, banners });
});

// POST /api/banners (admin, multipart)
export const createBanner = asyncHandler(async (req, res) => {
  try {
    if (!req.file) throw httpError("Banner image is required");
    const { title, subtitle, link, isActive, order } = req.body;
    const banner = await Banner.create({
      title,
      subtitle,
      link: link || "/menu",
      isActive: toBool(isActive, true),
      order: Number(order) || 0,
      image: { url: req.file.path, public_id: req.file.filename },
    });
    res.status(201).json({ success: true, banner });
  } catch (err) {
    if (req.file) await deleteImage(req.file.filename);
    throw err;
  }
});

// PUT /api/banners/:id (admin, multipart)
export const updateBanner = asyncHandler(async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) throw httpError("Banner not found", 404);

    const { title, subtitle, link, isActive, order } = req.body;
    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (link !== undefined) banner.link = link || "/menu";
    if (isActive !== undefined) banner.isActive = toBool(isActive, banner.isActive);
    if (order !== undefined) banner.order = Number(order) || 0;

    const oldImageId = banner.image?.public_id;
    if (req.file) banner.image = { url: req.file.path, public_id: req.file.filename };

    await banner.save();
    if (req.file) await deleteImage(oldImageId);
    res.json({ success: true, banner });
  } catch (err) {
    if (req.file) await deleteImage(req.file.filename);
    throw err;
  }
});

// DELETE /api/banners/:id (admin)
export const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw httpError("Banner not found", 404);
  await deleteImage(banner.image?.public_id);
  await banner.deleteOne();
  res.json({ success: true, message: "Banner deleted" });
});
