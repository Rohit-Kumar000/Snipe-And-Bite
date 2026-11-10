import { round2 } from "./helpers.js";

// Turns order lines into the total ingredient quantities they use.
//  lines:     order items ({ kind, menuItem, combo, qty })
//  menuById:  Map of menu item id -> { costing: { ingredients: [{ stockItem, qty }] } }
//  comboById: Map of combo id -> { items: [{ menuItem, qty }] }
// A combo is expanded into its menu items, so its ingredients are deducted like any other dish.
// Returns Map of stock item id -> quantity.
export const ingredientsForOrder = (lines, menuById, comboById) => {
  const totals = new Map();
  const addDish = (menuItemId, times) => {
    for (const ing of menuById.get(String(menuItemId))?.costing?.ingredients || []) {
      if (!(ing.qty > 0)) continue;
      const key = String(ing.stockItem);
      totals.set(key, (totals.get(key) || 0) + ing.qty * times);
    }
  };
  for (const line of lines) {
    if (line.kind === "combo") {
      for (const part of comboById.get(String(line.combo))?.items || []) addDish(part.menuItem, part.qty * line.qty);
    } else {
      addDish(line.menuItem, line.qty);
    }
  }
  for (const [key, value] of totals) totals.set(key, round2(value));
  return totals;
};
