import { createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { apiThunk } from "../../utils/thunk";

// Customer
export const placeOrder = apiThunk("orders/place", (body) => api.post("/orders", body));
export const fetchMyOrders = apiThunk("orders/fetchMine", (params) => api.get("/orders/my", { params }));
export const fetchOrder = apiThunk("orders/fetchOne", (id) => api.get(`/orders/${id}`));
export const cancelOrder = apiThunk("orders/cancel", ({ id, reason }) =>
  api.put(`/orders/${id}/cancel`, { reason })
);

// Admin
export const fetchAdminOrders = apiThunk("orders/fetchAdmin", (params) => api.get("/orders", { params }));
export const updateOrderStatus = apiThunk("orders/updateStatus", ({ id, status, reason }) =>
  api.put(`/orders/${id}/status`, { status, reason })
);
export const updatePaymentStatus = apiThunk("orders/updatePayment", ({ id, paymentStatus }) =>
  api.put(`/orders/${id}/payment-status`, { paymentStatus })
);

const orderSlice = createSlice({
  name: "orders",
  initialState: {
    mine: [],
    minePages: 1,
    mineLoading: false,
    current: null,
    currentLoading: false,
    currentError: "",
    admin: [],
    adminTotal: 0,
    adminPages: 1,
    adminCounts: {},
    adminLoading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOrders.pending, (state) => {
        state.mineLoading = true;
      })
      .addCase(fetchMyOrders.fulfilled, (state, { payload }) => {
        state.mineLoading = false;
        state.mine = payload.orders;
        state.minePages = payload.pages;
      })
      .addCase(fetchMyOrders.rejected, (state) => {
        state.mineLoading = false;
      })
      .addCase(fetchOrder.pending, (state, { meta }) => {
        // Only show the full page loader on the first load, not on background refreshes.
        if (!state.current || state.current._id !== meta.arg) state.currentLoading = true;
        state.currentError = "";
      })
      .addCase(fetchOrder.fulfilled, (state, { payload }) => {
        state.currentLoading = false;
        state.current = payload.order;
      })
      .addCase(fetchOrder.rejected, (state, { payload }) => {
        state.currentLoading = false;
        state.currentError = payload || "Order not found";
      })
      .addCase(cancelOrder.fulfilled, (state, { payload }) => {
        state.current = payload.order;
      })
      .addCase(fetchAdminOrders.pending, (state) => {
        state.adminLoading = true;
      })
      .addCase(fetchAdminOrders.fulfilled, (state, { payload }) => {
        state.adminLoading = false;
        state.admin = payload.orders;
        state.adminTotal = payload.total;
        state.adminPages = payload.pages;
        state.adminCounts = payload.counts;
      })
      .addCase(fetchAdminOrders.rejected, (state) => {
        state.adminLoading = false;
      })
      .addCase(updateOrderStatus.fulfilled, (state, { payload }) => {
        state.admin = state.admin.map((o) =>
          o._id === payload.order._id ? { ...o, ...payload.order, user: o.user } : o
        );
        if (state.current?._id === payload.order._id) {
          state.current = { ...state.current, ...payload.order, user: state.current.user };
        }
      })
      .addCase(updatePaymentStatus.fulfilled, (state, { payload }) => {
        if (state.current?._id === payload.order._id) {
          state.current = { ...state.current, ...payload.order, user: state.current.user };
        }
      });
  },
});

export default orderSlice.reducer;
