import { createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { apiThunk } from "../../utils/thunk";

export const fetchStats = apiThunk("admin/stats", () => api.get("/dashboard/stats"));
export const fetchSalesChart = apiThunk("admin/salesChart", (days = 7) =>
  api.get("/dashboard/sales-chart", { params: { days } })
);
export const fetchTopItems = apiThunk("admin/topItems", () => api.get("/dashboard/top-items"));

export const fetchCustomers = apiThunk("admin/customers", (params) => api.get("/users", { params }));
export const toggleBlockUser = apiThunk("admin/toggleBlock", (id) => api.put(`/users/${id}/block`));

export const fetchAllBanners = apiThunk("admin/banners", () => api.get("/banners/all"));
export const createBanner = apiThunk("admin/createBanner", (formData) => api.post("/banners", formData));
export const updateBanner = apiThunk("admin/updateBanner", ({ id, formData }) =>
  api.put(`/banners/${id}`, formData)
);
export const deleteBanner = apiThunk("admin/deleteBanner", (id) => api.delete(`/banners/${id}`));

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    stats: null,
    extra: { finance: null, recentActivity: [], lowStockItems: [] },
    statsLoading: false,
    chart: [],
    topItems: [],
    customers: [],
    customersPages: 1,
    customersLoading: false,
    banners: [],
    bannersLoading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (state) => {
        state.statsLoading = true;
      })
      .addCase(fetchStats.fulfilled, (state, { payload }) => {
        state.statsLoading = false;
        state.stats = payload.stats;
        state.extra = { finance: payload.finance || null, recentActivity: payload.recentActivity || [], lowStockItems: payload.lowStockItems || [] };
      })
      .addCase(fetchStats.rejected, (state) => {
        state.statsLoading = false;
      })
      .addCase(fetchSalesChart.fulfilled, (state, { payload }) => {
        state.chart = payload.chart;
      })
      .addCase(fetchTopItems.fulfilled, (state, { payload }) => {
        state.topItems = payload.items;
      })
      .addCase(fetchCustomers.pending, (state) => {
        state.customersLoading = true;
      })
      .addCase(fetchCustomers.fulfilled, (state, { payload }) => {
        state.customersLoading = false;
        state.customers = payload.customers;
        state.customersPages = payload.pages;
      })
      .addCase(fetchCustomers.rejected, (state) => {
        state.customersLoading = false;
      })
      .addCase(toggleBlockUser.fulfilled, (state, { payload, meta }) => {
        const customer = state.customers.find((c) => c._id === meta.arg);
        if (customer) customer.isBlocked = payload.isBlocked;
      })
      .addCase(fetchAllBanners.pending, (state) => {
        state.bannersLoading = true;
      })
      .addCase(fetchAllBanners.fulfilled, (state, { payload }) => {
        state.bannersLoading = false;
        state.banners = payload.banners;
      })
      .addCase(fetchAllBanners.rejected, (state) => {
        state.bannersLoading = false;
      });
  },
});

export default adminSlice.reducer;
