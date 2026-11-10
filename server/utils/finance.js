import { round2 } from "./helpers.js";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// Total cost of making one unit of a product from real recorded costs.
// ingredients: [{ qty, unitCost }], packagingCost, extraCost, purchaseCost (for resold items).
export const productCost = ({ purchaseCost = 0, ingredients = [], packagingCost = 0, extraCost = 0 } = {}) => {
  const ingredientCost = ingredients.reduce((sum, i) => sum + num(i.qty) * num(i.unitCost), 0);
  return round2(num(purchaseCost) + ingredientCost + num(packagingCost) + num(extraCost));
};

// Gross profit and margin for one unit. Margin is a percentage of the selling price.
export const profitability = (sellingPrice, cost) => {
  const price = num(sellingPrice);
  const totalCost = num(cost);
  const grossProfit = round2(price - totalCost);
  const marginPct = price > 0 ? round2((grossProfit / price) * 100) : 0;
  return { sellingPrice: round2(price), totalCost: round2(totalCost), grossProfit, marginPct };
};

// Profit and loss for a period from already summed figures.
export const profitAndLoss = ({ revenue = 0, refunds = 0, cogs = 0, expenses = 0, payroll = 0 } = {}) => {
  const netRevenue = round2(num(revenue) - num(refunds));
  const grossProfit = round2(netRevenue - num(cogs));
  const operatingCosts = round2(num(expenses) + num(payroll));
  const netProfit = round2(grossProfit - operatingCosts);
  return {
    revenue: round2(num(revenue)),
    refunds: round2(num(refunds)),
    netRevenue,
    cogs: round2(num(cogs)),
    grossProfit,
    expenses: round2(num(expenses)),
    payroll: round2(num(payroll)),
    netProfit,
    netMarginPct: netRevenue > 0 ? round2((netProfit / netRevenue) * 100) : 0,
  };
};

// Value of stock on hand. items: [{ quantity, unitCost }]
export const inventoryValuation = (items = []) =>
  round2(items.reduce((sum, i) => sum + num(i.quantity) * num(i.unitCost), 0));

// New weighted average unit cost after receiving stock.
export const weightedAverageCost = (oldQty, oldCost, inQty, inCost) => {
  const oq = Math.max(Number(oldQty) || 0, 0);
  const iq = num(inQty);
  if (iq === 0) return round2(num(oldCost));
  if (oq === 0) return round2(num(inCost));
  return round2((oq * num(oldCost) + iq * num(inCost)) / (oq + iq));
};

// Cost of one unit of a menu item. `unitCosts` maps stock item id to its current unit cost.
export const menuItemUnitCost = (costing = {}, unitCosts = new Map()) =>
  productCost({
    purchaseCost: costing.purchaseCost,
    packagingCost: costing.packagingCost,
    extraCost: costing.extraCost,
    ingredients: (costing.ingredients || []).map((i) => ({ qty: i.qty, unitCost: unitCosts.get(String(i.stockItem)) || 0 })),
  });
