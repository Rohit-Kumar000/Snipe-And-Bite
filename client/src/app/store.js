import { configureStore } from "@reduxjs/toolkit";
import authReducer, { forceLogout } from "../features/auth/authSlice";
import settingsReducer from "../features/settings/settingsSlice";
import menuReducer from "../features/menu/menuSlice";
import categoryReducer from "../features/category/categorySlice";
import cartReducer, { saveCart } from "../features/cart/cartSlice";
import orderReducer from "../features/orders/orderSlice";
import couponReducer from "../features/coupon/couponSlice";
import reservationReducer from "../features/reservation/reservationSlice";
import reviewReducer from "../features/reviews/reviewSlice";
import adminReducer from "../features/admin/adminSlice";
import { setUnauthorizedHandler } from "../services/api";

const store = configureStore({
  reducer: {
    auth: authReducer,
    settings: settingsReducer,
    menu: menuReducer,
    category: categoryReducer,
    cart: cartReducer,
    orders: orderReducer,
    coupon: couponReducer,
    reservation: reservationReducer,
    reviews: reviewReducer,
    admin: adminReducer,
  },
});

// Persist the cart whenever it changes.
let previousCart = store.getState().cart;
store.subscribe(() => {
  const currentCart = store.getState().cart;
  if (currentCart !== previousCart) {
    previousCart = currentCart;
    saveCart(currentCart);
  }
});

// An expired or invalid token logs the user out everywhere.
setUnauthorizedHandler(() => store.dispatch(forceLogout()));

export default store;
