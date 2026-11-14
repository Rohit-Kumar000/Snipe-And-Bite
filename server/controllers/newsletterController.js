import Subscriber from "../models/Subscriber.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getPagination, httpError } from "../utils/helpers.js";
import { toCsv } from "../utils/csv.js";

// POST /api/newsletter  public. Subscribing twice is not an error, and the answer never reveals who is already subscribed.
export const subscribe = asyncHandler(async (req, res) => {
  if (req.body.website) return res.status(201).json({ success: true }); // honeypot: bots fill hidden fields
  const existing = await Subscriber.findOne({ email: req.body.email });
  if (!existing) await Subscriber.create({ email: req.body.email });
  else if (!existing.isActive) { existing.isActive = true; await existing.save(); }
  res.status(201).json({ success: true, message: "Thank you for subscribing" });
});

// GET /api/newsletter?page=&format=csv  team only
export const listSubscribers = asyncHandler(async (req, res) => {
  if (req.query.format === "csv") {
    const rows = await Subscriber.find({ isActive: true }).sort({ subscribedAt: -1 }).lean();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="newsletter-subscribers.csv"');
    return res.send(toCsv([{ key: "email", label: "Email" }, { key: "subscribedAt", label: "Subscribed" }], rows));
  }
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const [subscribers, total] = await Promise.all([Subscriber.find({ isActive: true }).sort({ subscribedAt: -1 }).skip(skip).limit(limit), Subscriber.countDocuments({ isActive: true })]);
  return res.json({ success: true, total, page, pages: Math.ceil(total / limit), subscribers });
});

export const removeSubscriber = asyncHandler(async (req, res) => {
  const sub = await Subscriber.findById(req.params.id);
  if (!sub) throw httpError("Subscriber not found", 404);
  await sub.deleteOne();
  res.json({ success: true });
});
