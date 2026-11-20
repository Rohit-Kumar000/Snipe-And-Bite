import { createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { apiThunk } from "../../utils/thunk";

export const fetchCategories = apiThunk("category/fetch", () => api.get("/categories"));
export const fetchAllCategories = apiThunk("category/fetchAll", () => api.get("/categories/all"));
export const createCategory = apiThunk("category/create", (formData) => api.post("/categories", formData));
export const updateCategory = apiThunk("category/update", ({ id, formData }) =>
  api.put(`/categories/${id}`, formData)
);
export const deleteCategory = apiThunk("category/delete", (id) => api.delete(`/categories/${id}`));

const categorySlice = createSlice({
  name: "category",
  initialState: { list: [], all: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.fulfilled, (state, { payload }) => {
        state.list = payload.categories;
      })
      .addCase(fetchAllCategories.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllCategories.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.all = payload.categories;
      })
      .addCase(fetchAllCategories.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default categorySlice.reducer;
