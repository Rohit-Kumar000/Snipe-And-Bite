import { createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { apiThunk } from "../../utils/thunk";

export const fetchItemReviews = apiThunk("reviews/fetchItem", ({ id, page = 1 }) =>
  api.get(`/reviews/item/${id}`, { params: { page } })
);
export const addReview = apiThunk("reviews/add", (body) => api.post("/reviews", body));
export const fetchAllReviews = apiThunk("reviews/fetchAll", (params) => api.get("/reviews", { params }));
export const deleteReview = apiThunk("reviews/delete", (id) => api.delete(`/reviews/${id}`));

const reviewSlice = createSlice({
  name: "reviews",
  initialState: {
    itemReviews: [],
    itemPages: 1,
    itemTotal: 0,
    itemLoading: false,
    all: [],
    allPages: 1,
    allLoading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchItemReviews.pending, (state) => {
        state.itemLoading = true;
      })
      .addCase(fetchItemReviews.fulfilled, (state, { payload }) => {
        state.itemLoading = false;
        state.itemReviews = payload.reviews;
        state.itemPages = payload.pages;
        state.itemTotal = payload.total;
      })
      .addCase(fetchItemReviews.rejected, (state) => {
        state.itemLoading = false;
      })
      .addCase(fetchAllReviews.pending, (state) => {
        state.allLoading = true;
      })
      .addCase(fetchAllReviews.fulfilled, (state, { payload }) => {
        state.allLoading = false;
        state.all = payload.reviews;
        state.allPages = payload.pages;
      })
      .addCase(fetchAllReviews.rejected, (state) => {
        state.allLoading = false;
      });
  },
});

export default reviewSlice.reducer;
