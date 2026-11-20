import { createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { apiThunk } from "../../utils/thunk";

export const fetchSettings = apiThunk("settings/fetch", () => api.get("/settings"));
export const updateSettings = apiThunk("settings/update", (body) => api.put("/settings", body));
export const fetchPaymentConfig = apiThunk("settings/paymentConfig", () => api.get("/payment/config"));

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    data: null,
    loaded: false,
    paymentEnabled: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.fulfilled, (state, { payload }) => {
        state.data = payload.settings;
        state.loaded = true;
      })
      .addCase(fetchSettings.rejected, (state) => {
        state.loaded = true;
      })
      .addCase(updateSettings.fulfilled, (state, { payload }) => {
        state.data = payload.settings;
      })
      .addCase(fetchPaymentConfig.fulfilled, (state, { payload }) => {
        state.paymentEnabled = payload.enabled;
      });
  },
});

export default settingsSlice.reducer;
