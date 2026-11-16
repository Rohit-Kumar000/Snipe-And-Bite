import PurchaseOrder from "../models/PurchaseOrder.js";
import Supplier from "../models/Supplier.js";
import StockItem from "../models/StockItem.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError, getPagination, round2 } from "../utils/helpers.js";
import { applyStock } from "../services/inventoryService.js";
import { logAudit } from "../services/auditService.js";

const newPoNumber = () => `PO-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const loadLines = async (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw httpError("Add at least one item");
  const ids = rawItems.map((i) => i.stockItem);
  const stock = await StockItem.find({ _id: { $in: ids } }).lean();
  const byId = new Map(stock.map((s) => [String(s._id), s]));
  return rawItems.map((raw) => {
    const s = byId.get(String(raw.stockItem));
    if (!s) throw httpError("A selected item does not exist in inventory");
    const quantity = Number(raw.quantity);
    const unitCost = Number(raw.unitCost);
    if (!(quantity > 0) || !(unitCost >= 0)) throw httpError(`Enter a valid quantity and cost for ${s.name}`);
    return { stockItem: s._id, name: s.name, unit: s.unit, quantity, unitCost };
  });
};
const totalOf = (lines) => round2(lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0));

// GET /api/purchases?status=&supplier=&page=
export const listPurchases = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 15, 50);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.supplier) filter.supplier = req.query.supplier;
  const [purchases, total] = await Promise.all([
    PurchaseOrder.find(filter).populate("supplier", "name phone").populate("createdBy", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    PurchaseOrder.countDocuments(filter),
  ]);
  res.json({ success: true, total, page, pages: Math.ceil(total / limit), purchases });
});

export const getPurchase = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id).populate("supplier").populate("createdBy", "name").populate("history.by", "name");
  if (!po) throw httpError("Purchase order not found", 404);
  res.json({ success: true, purchase: po });
});

// POST /api/purchases  creates a draft (or an ordered PO when submit is true)
export const createPurchase = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({ _id: req.body.supplier, isActive: true });
  if (!supplier) throw httpError("Choose an active supplier");
  const items = await loadLines(req.body.items);
  const status = req.body.submit ? "ordered" : "draft";
  const po = await PurchaseOrder.create({
    poNumber: newPoNumber(), supplier: supplier._id, items, status, totalAmount: totalOf(items),
    expectedDate: req.body.expectedDate || null, notes: req.body.notes || "", createdBy: req.user._id,
    history: [{ status, by: req.user._id }],
  });
  await logAudit(req, { action: "PURCHASE_ORDER_CREATED", resourceType: "PurchaseOrder", resourceId: po._id, summary: `${po.poNumber} for ${supplier.name}` });
  res.status(201).json({ success: true, purchase: po });
});

// PUT /api/purchases/:id  only drafts can be edited
export const updatePurchase = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw httpError("Purchase order not found", 404);
  if (po.status !== "draft") throw httpError("Only draft purchase orders can be edited");
  if (req.body.items) { po.items = await loadLines(req.body.items); po.totalAmount = totalOf(po.items); }
  if (req.body.supplier) po.supplier = req.body.supplier;
  if (req.body.expectedDate !== undefined) po.expectedDate = req.body.expectedDate || null;
  if (req.body.notes !== undefined) po.notes = req.body.notes;
  await po.save();
  res.json({ success: true, purchase: po });
});

// PUT /api/purchases/:id/status  { status: "ordered" | "cancelled" }
export const setPurchaseStatus = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw httpError("Purchase order not found", 404);
  const { status } = req.body;
  const allowed = { draft: ["ordered", "cancelled"], ordered: ["cancelled"] };
  if (!allowed[po.status]?.includes(status)) throw httpError(`A ${po.status.replace("_", " ")} order cannot be changed to ${status}`);
  po.status = status;
  po.history.push({ status, by: req.user._id });
  await po.save();
  await logAudit(req, { action: "PURCHASE_ORDER_STATUS", resourceType: "PurchaseOrder", resourceId: po._id, summary: `${po.poNumber} marked ${status}` });
  res.json({ success: true, purchase: po });
});

// POST /api/purchases/:id/receive  { items: [{ itemId, quantity }] }  adds stock and records stock-in
export const receivePurchase = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw httpError("Purchase order not found", 404);
  if (!["ordered", "partially_received"].includes(po.status)) throw httpError("Only an ordered purchase can be received");
  const lines = Array.isArray(req.body.items) ? req.body.items : [];
  if (lines.length === 0) throw httpError("Enter the quantity received");

  // Validate everything first so a bad line cannot leave the order half received.
  const plan = lines.map((l) => {
    const item = po.items.id(l.itemId);
    const qty = Number(l.quantity);
    if (!item) throw httpError("A line does not belong to this order");
    if (!(qty > 0)) throw httpError(`Enter a valid quantity for ${item.name}`);
    if (item.receivedQuantity + qty > item.quantity + 1e-9) throw httpError(`${item.name}: cannot receive more than ordered`);
    return { item, qty };
  });

  for (const { item, qty } of plan) {
    await applyStock({ stockItemId: item.stockItem, change: qty, type: "purchase", unitCost: item.unitCost, reference: `PurchaseOrder:${po._id}`, note: po.poNumber, by: req.user._id });
    item.receivedQuantity = round2(item.receivedQuantity + qty);
  }
  const done = po.items.every((i) => i.receivedQuantity >= i.quantity - 1e-9);
  po.status = done ? "received" : "partially_received";
  if (done) po.receivedAt = new Date();
  po.history.push({ status: po.status, by: req.user._id });
  await po.save();
  await logAudit(req, { action: "PURCHASE_RECEIVED", resourceType: "PurchaseOrder", resourceId: po._id, summary: `${po.poNumber} ${po.status.replace("_", " ")}` });
  res.json({ success: true, purchase: po });
});

// PUT /api/purchases/:id/pay
export const markPurchasePaid = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw httpError("Purchase order not found", 404);
  if (po.status === "cancelled" || po.status === "draft") throw httpError("This order cannot be marked paid");
  po.paymentStatus = "paid";
  po.paidAt = new Date();
  await po.save();
  res.json({ success: true, purchase: po });
});
