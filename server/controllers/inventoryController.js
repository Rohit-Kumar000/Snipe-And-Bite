import mongoose from "mongoose";
import StockItem from "../models/StockItem.js";
import StockMovement from "../models/StockMovement.js";
import Supplier from "../models/Supplier.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import MenuItem from "../models/MenuItem.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError, escapeRegex, getPagination, round2 } from "../utils/helpers.js";
import { inventoryValuation, menuItemUnitCost, profitability } from "../utils/finance.js";
import { applyStock } from "../services/inventoryService.js";
import { logAudit } from "../services/auditService.js";

// ---------- Stock items ----------

// GET /api/inventory?search=&low=true&page=
export const listStock = asyncHandler(async (req, res) => {
  const { search, low } = req.query;
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const filter = {};
  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), "i");
    filter.$or = [{ name: rx }, { sku: rx }, { category: rx }];
  }
  if (low === "true") filter.$expr = { $lte: ["$quantity", "$reorderLevel"] };

  const [items, total, all] = await Promise.all([
    StockItem.find(filter).populate("supplier", "name").sort({ name: 1 }).skip(skip).limit(limit),
    StockItem.countDocuments(filter),
    StockItem.find({ isActive: true }).select("quantity unitCost reorderLevel").lean(),
  ]);
  res.json({
    success: true, total, page, pages: Math.ceil(total / limit), items,
    summary: {
      itemCount: all.length,
      lowStockCount: all.filter((i) => i.quantity <= i.reorderLevel).length,
      valuation: inventoryValuation(all.map((i) => ({ quantity: i.quantity, unitCost: i.unitCost }))),
    },
  });
});

// GET /api/inventory/alerts
export const lowStockAlerts = asyncHandler(async (req, res) => {
  const items = await StockItem.find({ isActive: true, $expr: { $lte: ["$quantity", "$reorderLevel"] } }).sort({ quantity: 1 }).limit(50);
  res.json({ success: true, count: items.length, items });
});

// POST /api/inventory
export const createStock = asyncHandler(async (req, res) => {
  const { name, sku, category, unit, reorderLevel, unitCost, supplier, openingQuantity } = req.body;
  const item = await StockItem.create({ name, sku, category, unit, reorderLevel, unitCost, supplier: supplier || null, quantity: 0 });
  if (Number(openingQuantity) > 0) {
    await applyStock({ stockItemId: item._id, change: Number(openingQuantity), type: "opening", unitCost: item.unitCost, note: "Opening stock", by: req.user._id });
  }
  await logAudit(req, { action: "STOCK_ITEM_CREATED", resourceType: "StockItem", resourceId: item._id, summary: `Added stock item ${item.name}` });
  res.status(201).json({ success: true, item: await StockItem.findById(item._id).populate("supplier", "name") });
});

// PUT /api/inventory/:id  (quantity is changed only through adjustments and purchases)
export const updateStock = asyncHandler(async (req, res) => {
  const item = await StockItem.findById(req.params.id);
  if (!item) throw httpError("Stock item not found", 404);
  for (const key of ["name", "sku", "category", "unit", "reorderLevel", "isActive"]) {
    if (req.body[key] !== undefined) item[key] = req.body[key];
  }
  if (req.body.supplier !== undefined) item.supplier = req.body.supplier || null;
  await item.save();
  res.json({ success: true, item: await item.populate("supplier", "name") });
});

// POST /api/inventory/:id/adjust  { mode: "add" | "remove" | "set", quantity, reason, type: "adjustment" | "waste" }
export const adjustStock = asyncHandler(async (req, res) => {
  const item = await StockItem.findById(req.params.id);
  if (!item) throw httpError("Stock item not found", 404);
  const quantity = Number(req.body.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) throw httpError("Enter a valid quantity");
  const mode = req.body.mode;
  let change;
  if (mode === "add") change = quantity;
  else if (mode === "remove") change = -quantity;
  else if (mode === "set") change = quantity - item.quantity;
  else throw httpError("Choose add, remove or set");
  if (change === 0) throw httpError("This does not change the stock");
  if (item.quantity + change < 0) throw httpError("Stock cannot go below zero");

  const type = req.body.type === "waste" && change < 0 ? "waste" : "adjustment";
  const updated = await applyStock({ stockItemId: item._id, change, type, reference: "Manual", note: req.body.reason, by: req.user._id });
  await logAudit(req, { action: "STOCK_ADJUSTED", resourceType: "StockItem", resourceId: item._id, summary: `${item.name}: ${change > 0 ? "+" : ""}${round2(change)} ${item.unit} (${req.body.reason})`, meta: { change, type } });
  res.json({ success: true, item: updated });
});

// GET /api/inventory/movements?item=&type=&page=
export const listMovements = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 25, 100);
  const filter = {};
  if (req.query.item) filter.stockItem = req.query.item;
  if (req.query.type) filter.type = req.query.type;
  const [movements, total] = await Promise.all([
    StockMovement.find(filter).populate("stockItem", "name unit").populate("by", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    StockMovement.countDocuments(filter),
  ]);
  res.json({ success: true, total, page, pages: Math.ceil(total / limit), movements });
});

// ---------- Suppliers ----------

export const listSuppliers = asyncHandler(async (req, res) => {
  const filter = req.query.all === "true" ? {} : { isActive: true };
  const suppliers = await Supplier.find(filter).sort({ name: 1 });
  res.json({ success: true, suppliers });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json({ success: true, supplier });
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw httpError("Supplier not found", 404);
  for (const key of ["name", "contactName", "phone", "email", "address", "gstin", "notes", "isActive"]) {
    if (req.body[key] !== undefined) supplier[key] = req.body[key];
  }
  await supplier.save();
  res.json({ success: true, supplier });
});

// Suppliers with purchase history are deactivated, never deleted, so records stay intact.
export const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw httpError("Supplier not found", 404);
  if (await PurchaseOrder.exists({ supplier: supplier._id })) {
    supplier.isActive = false;
    await supplier.save();
    return res.json({ success: true, deactivated: true, message: "Supplier has purchase history, so it was deactivated instead of deleted" });
  }
  await supplier.deleteOne();
  return res.json({ success: true, deleted: true });
});

// ---------- Product costing ----------

const loadUnitCosts = async () => new Map((await StockItem.find().select("unitCost").lean()).map((s) => [String(s._id), s.unitCost]));

// GET /api/costing/products
export const listProductCosting = asyncHandler(async (req, res) => {
  const [items, unitCosts] = await Promise.all([MenuItem.find().populate("category", "name").populate("costing.ingredients.stockItem", "name unit unitCost").sort({ name: 1 }), loadUnitCosts()]);
  const rows = items.map((item) => {
    const cost = menuItemUnitCost({ ...item.costing?.toObject?.(), ingredients: (item.costing?.ingredients || []).map((i) => ({ stockItem: i.stockItem?._id, qty: i.qty })) }, unitCosts);
    return { _id: item._id, name: item.name, category: item.category?.name, price: item.currentPrice, costing: item.costing, ...profitability(item.currentPrice, cost) };
  });
  res.json({ success: true, products: rows });
});

// PUT /api/costing/products/:id
export const updateProductCosting = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw httpError("Product not found", 404);
  const { purchaseCost, packagingCost, extraCost, ingredients } = req.body;
  const list = Array.isArray(ingredients) ? ingredients : [];
  for (const ing of list) {
    if (!mongoose.isValidObjectId(ing.stockItem) || !(Number(ing.qty) >= 0)) throw httpError("Each ingredient needs a stock item and a quantity");
  }
  const found = await StockItem.countDocuments({ _id: { $in: list.map((i) => i.stockItem) } });
  if (found !== new Set(list.map((i) => String(i.stockItem))).size) throw httpError("An ingredient does not exist in inventory");

  item.costing = {
    purchaseCost: Number(purchaseCost) || 0, packagingCost: Number(packagingCost) || 0, extraCost: Number(extraCost) || 0,
    ingredients: list.map((i) => ({ stockItem: i.stockItem, qty: Number(i.qty) })),
  };
  await item.save();
  await logAudit(req, { action: "PRODUCT_COSTING_UPDATED", resourceType: "MenuItem", resourceId: item._id, summary: `Updated costing for ${item.name}` });
  res.json({ success: true, costing: item.costing });
});
