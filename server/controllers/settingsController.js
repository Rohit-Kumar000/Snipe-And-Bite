import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError, toBool } from "../utils/helpers.js";
import { logAudit } from "../services/auditService.js";

const TEXT_FIELDS = ["restaurantName", "tagline", "phone", "whatsappNumber", "email", "address", "gstNumber", "openTime", "closeTime"];
const NUMBER_FIELDS = ["deliveryCharge", "freeDeliveryAbove", "taxPercent", "minOrderAmount", "loyaltyPercent"];

// GET /api/settings (public)
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();
  res.json({ success: true, settings });
});

// PUT /api/settings (admin)
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();

  for (const field of TEXT_FIELDS) {
    if (req.body[field] !== undefined) settings[field] = String(req.body[field]).trim();
  }
  for (const field of NUMBER_FIELDS) {
    if (req.body[field] !== undefined) {
      const value = Number(req.body[field]);
      if (Number.isNaN(value) || value < 0) throw httpError(`${field} must be a positive number`);
      settings[field] = value;
    }
  }
  if (req.body.isOpen !== undefined) settings.isOpen = toBool(req.body.isOpen, settings.isOpen);

  if (req.body.socialLinks !== undefined) {
    if (!req.body.socialLinks || typeof req.body.socialLinks !== "object" || Array.isArray(req.body.socialLinks)) throw httpError("Social links must be an object");
    for (const key of ["facebook", "instagram", "linkedin"]) {
      const value = String(req.body.socialLinks[key] || "").trim();
      if (value && (!/^https:\/\//i.test(value) || !URL.canParse(value))) throw httpError(`Enter a valid HTTPS ${key} link`);
      settings.socialLinks[key] = value;
    }
  }

  if (req.body.servicePincodes !== undefined) {
    const list = Array.isArray(req.body.servicePincodes)
      ? req.body.servicePincodes
      : String(req.body.servicePincodes).split(",");
    const pincodes = [...new Set(list.map((p) => String(p).trim()).filter(Boolean))];
    if (pincodes.some((p) => !/^\d{6}$/.test(p))) throw httpError("Every pincode must be 6 digits");
    settings.servicePincodes = pincodes;
  }

  await settings.save();
  await logAudit(req, { action: "SETTINGS_UPDATED", resourceType: "Settings", resourceId: settings._id, summary: "Website settings updated" });
  res.json({ success: true, settings });
});
