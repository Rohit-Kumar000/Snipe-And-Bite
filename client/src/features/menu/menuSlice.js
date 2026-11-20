import { createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { apiThunk } from "../../utils/thunk";

// Public data
export const fetchMenu = apiThunk("menu/fetch", (params) => api.get("/menu", { params }));
export const fetchMenuItem = apiThunk("menu/fetchOne", (id) => api.get(`/menu/${id}`));
export const fetchDeals = apiThunk("menu/fetchDeals", () => api.get("/menu/deals"));
export const fetchBestsellers = apiThunk("menu/fetchBestsellers", () =>
  api.get("/menu", { params: { bestseller: true, available: true, limit: 8 } })
);
export const fetchCombos = apiThunk("menu/fetchCombos", () => api.get("/combos"));
export const fetchBanners = apiThunk("menu/fetchBanners", () => api.get("/banners"));

// Admin actions (the pages refresh their lists after these succeed)
export const createMenuItem = apiThunk("menu/create", (formData) => api.post("/menu", formData));
export const updateMenuItem = apiThunk("menu/update", ({ id, formData }) => api.put(`/menu/${id}`, formData));
export const deleteMenuItem = apiThunk("menu/delete", (id) => api.delete(`/menu/${id}`));
export const toggleAvailability = apiThunk("menu/toggleAvailability", (id) =>
  api.patch(`/menu/${id}/availability`)
);
export const createCombo = apiThunk("combo/create", (formData) => api.post("/combos", formData));
export const updateCombo = apiThunk("combo/update", ({ id, formData }) => api.put(`/combos/${id}`, formData));
export const deleteCombo = apiThunk("combo/delete", (id) => api.delete(`/combos/${id}`));

const menuSlice = createSlice({
  name: "menu",
  initialState: {
    items: [],
    total: 0,
    page: 1,
    pages: 1,
    loading: false,
    error: "",
    current: null,
    currentLoading: false,
    currentError: "",
    deals: [],
    bestsellers: [],
    combos: [],
    banners: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenu.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchMenu.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.items = payload.items;
        state.total = payload.total;
        state.page = payload.page;
        state.pages = payload.pages;
      })
      .addCase(fetchMenu.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload || "Could not load the menu";
      })
      .addCase(fetchMenuItem.pending, (state) => {
        state.currentLoading = true;
        state.currentError = "";
        state.current = null;
      })
      .addCase(fetchMenuItem.fulfilled, (state, { payload }) => {
        state.currentLoading = false;
        state.current = payload.item;
      })
      .addCase(fetchMenuItem.rejected, (state, { payload }) => {
        state.currentLoading = false;
        state.currentError = payload || "Item not found";
      })
      .addCase(fetchDeals.fulfilled, (state, { payload }) => {
        state.deals = payload.items;
      })
      .addCase(fetchBestsellers.fulfilled, (state, { payload }) => {
        state.bestsellers = payload.items;
      })
      .addCase(fetchCombos.fulfilled, (state, { payload }) => {
        state.combos = payload.combos;
      })
      .addCase(fetchBanners.fulfilled, (state, { payload }) => {
        state.banners = payload.banners;
      });
  },
});

export default menuSlice.reducer;
