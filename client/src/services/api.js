import axios from "axios";
import { getToken } from "./sessionStore";

// The server sends one of these codes only when the login itself is over. Other 401 answers, such as a
// wrong password on a sensitive action, are normal errors and must not sign the person out.
const SESSION_ERROR_CODES = ["SESSION_EXPIRED", "ACCOUNT_SUSPENDED"];
export const isSessionError = (error) => SESSION_ERROR_CODES.includes(error.response?.data?.code);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 30000,
  // Required for the server's 9-hour Remember Me cookie when the client and API use different origins.
  withCredentials: true,
});

// Adds the saved JWT to every request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The store registers a handler here, so an expired session logs the user out automatically.
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isSessionError(error)) onUnauthorized?.();
    return Promise.reject(error);
  }
);

// Extracts a readable message from an Axios error.
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === "ERR_NETWORK") return "Cannot reach the server. Please check your connection.";
  return error.message || "Something went wrong";
};

export default api;
