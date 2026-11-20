import api from "../../services/api";

// Thin wrappers around the auth and user endpoints. Each returns the Axios promise.
const authService = {
  register: (body) => api.post("/auth/register", body),
  login: (body) => api.post("/auth/login", body),
  oauthExchange: (code) => api.post("/auth/oauth/exchange", { code }),
  verifyTwoFactor: (body) => api.post("/auth/2fa/verify", body),
  logout: () => api.post("/auth/logout"),
  logoutAll: () => api.post("/auth/logout-all"),
  me: () => api.get("/auth/me"),
  forgotPassword: (body) => api.post("/auth/forgot-password", body),
  resetPassword: ({ token, password }) => api.put(`/auth/reset-password/${token}`, { password }),
  updateProfile: (body) => api.put("/users/profile", body),
  changePassword: (body) => api.put("/users/password", body),
  addAddress: (body) => api.post("/users/address", body),
  setDefaultAddress: (id) => api.put(`/users/address/${id}/default`),
  deleteAddress: (id) => api.delete(`/users/address/${id}`),
  uploadImage: (kind, file) => {
    const form = new FormData();
    form.append("image", file);
    return api.put(`/users/profile/${kind}`, form);
  },
  removeImage: (kind) => api.delete(`/users/profile/${kind}`),
  listSessions: () => api.get("/auth/sessions"),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  twoFactorSetup: () => api.post("/auth/2fa/setup"),
  twoFactorEnable: (code) => api.post("/auth/2fa/enable", { code }),
  twoFactorRecoveryCodes: (body) => api.post("/auth/2fa/recovery-codes", body),
  twoFactorDisable: (body) => api.post("/auth/2fa/disable", body),
};

export default authService;
