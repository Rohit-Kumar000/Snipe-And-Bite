import { createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { apiThunk } from "../../utils/thunk";

export const createReservation = apiThunk("reservation/create", (body) => api.post("/reservations", body));
export const fetchMyReservations = apiThunk("reservation/fetchMine", () => api.get("/reservations/my"));
export const cancelReservation = apiThunk("reservation/cancel", (id) => api.put(`/reservations/${id}/cancel`));
export const fetchAllReservations = apiThunk("reservation/fetchAll", (params) =>
  api.get("/reservations", { params })
);
export const updateReservationStatus = apiThunk("reservation/updateStatus", ({ id, status }) =>
  api.put(`/reservations/${id}`, { status })
);

const reservationSlice = createSlice({
  name: "reservation",
  initialState: { mine: [], mineLoading: false, all: [], allPages: 1, allLoading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyReservations.pending, (state) => {
        state.mineLoading = true;
      })
      .addCase(fetchMyReservations.fulfilled, (state, { payload }) => {
        state.mineLoading = false;
        state.mine = payload.reservations;
      })
      .addCase(fetchMyReservations.rejected, (state) => {
        state.mineLoading = false;
      })
      .addCase(fetchAllReservations.pending, (state) => {
        state.allLoading = true;
      })
      .addCase(fetchAllReservations.fulfilled, (state, { payload }) => {
        state.allLoading = false;
        state.all = payload.reservations;
        state.allPages = payload.pages;
      })
      .addCase(fetchAllReservations.rejected, (state) => {
        state.allLoading = false;
      });
  },
});

export default reservationSlice.reducer;
