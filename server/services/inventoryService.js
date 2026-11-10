import StockItem from "../models/StockItem.js";
import StockMovement from "../models/StockMovement.js";
import MenuItem from "../models/MenuItem.js";
import Combo from "../models/Combo.js";
import { ingredientsForOrder } from "../utils/recipes.js";
import { weightedAverageCost } from "../utils/finance.js";
import { httpError, round2 } from "../utils/helpers.js";
import { notifyRoles } from "./notificationService.js";

// Changes stock by a signed amount and records the movement. Purchases also update the average cost.
export const applyStock = async ({ stockItemId, change, type, unitCost, reference = "", note = "", by = null }) => {
  const before = await StockItem.findById(stockItemId);
  if (!before) throw httpError("Stock item not found", 404);
  const update = { $inc: { quantity: change } };
  if (type === "purchase" && change > 0) {
    update.$set = { unitCost: weightedAverageCost(before.quantity, before.unitCost, change, unitCost) };
  }
  const after = await StockItem.findByIdAndUpdate(stockItemId, update, { returnDocument: "after" });
  await StockMovement.create({
    stockItem: after._id, type, quantityChange: round2(change), balanceAfter: round2(after.quantity),
    unitCost: unitCost ?? after.unitCost, reference, note, by,
  });
  // Warn the team once, when stock first drops to or below the reorder level.
  if (before.quantity > before.reorderLevel && after.quantity <= after.reorderLevel) {
    await notifyRoles(["SUPER_ADMIN", "ADMIN", "MANAGER"], {
      type: "low_stock", title: `Low stock: ${after.name}`,
      body: `${round2(after.quantity)} ${after.unit} left (reorder level ${after.reorderLevel})`, link: "/admin/inventory",
    });
  }
  return after;
};

// Loads the recipes an order needs (dishes and the dishes inside combos) and totals the ingredients.
const orderIngredients = async (order) => {
  const comboIds = order.items.filter((l) => l.kind === "combo" && l.combo).map((l) => l.combo);
  const combos = await Combo.find({ _id: { $in: comboIds } }).select("items").lean();
  const comboById = new Map(combos.map((c) => [String(c._id), c]));
  const menuIds = [
    ...order.items.filter((l) => l.kind !== "combo" && l.menuItem).map((l) => l.menuItem),
    ...combos.flatMap((c) => c.items.map((i) => i.menuItem)),
  ];
  const menu = await MenuItem.find({ _id: { $in: menuIds } }).select("costing").lean();
  return ingredientsForOrder(order.items, new Map(menu.map((m) => [String(m._id), m])), comboById);
};

// Deducts ingredient stock for a confirmed order. Safe to call twice: the order remembers it was done.
export const consumeForOrder = async (order) => {
  if (order.stockDeducted) return;
  for (const [stockItemId, qty] of await orderIngredients(order)) {
    await applyStock({ stockItemId, change: -qty, type: "sale", reference: `Order:${order._id}`, note: order.orderNumber });
  }
  order.stockDeducted = true;
};

// Puts the stock back when an order that had already consumed it is cancelled.
export const restoreForOrder = async (order) => {
  if (!order.stockDeducted) return;
  for (const [stockItemId, qty] of await orderIngredients(order)) {
    await applyStock({ stockItemId, change: qty, type: "sale_reversal", reference: `Order:${order._id}`, note: `Cancelled ${order.orderNumber}` });
  }
  order.stockDeducted = false;
};
