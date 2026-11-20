import { createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { apiThunk } from "../../utils/thunk";

export const fetchPublicCoupons = apiThunk("coupon/fetchPublic", () => api.get("/coupons/public"));
export const applyCoupon = apiThunk("coupon/apply", (body) => api.post("/coupons/apply", body));
export const fetchCoupons = apiThunk("coupon/fetchAll", () => api.get("/coupons"));
export const createCoupon = apiThunk("coupon/create", (body) => api.post("/coupons", body));
export const updateCoupon = apiThunk("coupon/update", ({ id, body }) => api.put(`/coupons/${id}`, body));
export const deleteCoupon = apiThunk("coupon/delete", (id) => api.delete(`/coupons/${id}`));

const couponSlice = createSlice({
  name: "coupon",
  initialState: { publicList: [], list: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicCoupons.fulfilled, (state, { payload }) => {
        state.publicList = payload.coupons;
      })
      .addCase(fetchCoupons.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCoupons.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list = payload.coupons;
      })
      .addCase(fetchCoupons.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default couponSlice.reducer;
