import { createSlice } from "@reduxjs/toolkit";

const CART_KEY = "sb_cart";
export const MAX_QTY = 20;

const loadCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    if (saved && Array.isArray(saved.items)) return saved;
  } catch {
    // Ignore corrupted data and start with an empty cart.
  }
  return { items: [], couponCode: "" };
};

export const saveCart = (cart) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify({ items: cart.items, couponCode: cart.couponCode }));
  } catch {
    // Storage can be full or blocked. The cart still works for this session.
  }
};

// The same dish with different add-ons is a separate cart line.
export const buildCartKey = (type, id, addOns = []) =>
  `${type}:${id}:${addOns.map((a) => a.name).sort().join("|")}`;

// Display price of one unit including add-ons. The server recalculates the real price.
export const unitPrice = (item) => item.price + item.addOns.reduce((sum, a) => sum + a.price, 0);

const cartSlice = createSlice({
  name: "cart",
  initialState: loadCart(),
  reducers: {
    // payload: { type: "menu" | "combo", id, name, image, isVeg, price, addOns, qty }
    addToCart: (state, { payload }) => {
      const addOns = payload.addOns || [];
      const key = buildCartKey(payload.type, payload.id, addOns);
      const existing = state.items.find((i) => i.key === key);
      const qty = payload.qty || 1;
      if (existing) {
        existing.qty = Math.min(existing.qty + qty, MAX_QTY);
        existing.price = payload.price;
      } else {
        state.items.push({ ...payload, addOns, key, qty: Math.min(qty, MAX_QTY) });
      }
    },
    increaseQty: (state, { payload }) => {
      const item = state.items.find((i) => i.key === payload);
      if (item && item.qty < MAX_QTY) item.qty += 1;
    },
    decreaseQty: (state, { payload }) => {
      const item = state.items.find((i) => i.key === payload);
      if (!item) return;
      if (item.qty > 1) item.qty -= 1;
      else state.items = state.items.filter((i) => i.key !== payload);
    },
    removeFromCart: (state, { payload }) => {
      state.items = state.items.filter((i) => i.key !== payload);
    },
    setCoupon: (state, { payload }) => {
      state.couponCode = payload;
    },
    clearCoupon: (state) => {
      state.couponCode = "";
    },
    clearCart: (state) => {
      state.items = [];
      state.couponCode = "";
    },
  },
});

export const { addToCart, increaseQty, decreaseQty, removeFromCart, setCoupon, clearCoupon, clearCart } =
  cartSlice.actions;

export const selectCartCount = (state) => state.cart.items.reduce((sum, i) => sum + i.qty, 0);
export const selectCartSubtotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + unitPrice(i) * i.qty, 0);

// The shape the API expects for pricing and ordering.
export const toApiItems = (items) =>
  items.map((i) => ({ type: i.type, id: i.id, qty: i.qty, addOns: i.addOns.map((a) => a.name) }));

export default cartSlice.reducer;
