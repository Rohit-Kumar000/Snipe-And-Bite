import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "../services/api";

// Creates an async thunk from a function that returns an Axios request.
// The thunk resolves with response.data and rejects with a readable error message.
export const apiThunk = (type, request) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      const { data } = await request(arg);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  });
