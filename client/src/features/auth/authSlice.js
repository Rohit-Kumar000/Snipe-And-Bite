import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";
import authService from "./authService";
import { apiThunk } from "../../utils/thunk";
import { getErrorMessage, isSessionError } from "../../services/api";
import { clearTemporaryLoginMark, clearToken, getToken, getTokenExpiry, hadTemporaryLogin, saveToken } from "../../services/sessionStore";

export const registerUser = apiThunk("auth/register", authService.register);
export const loginUser = apiThunk("auth/login", authService.login);
export const oauthExchangeUser = apiThunk("auth/oauthExchange", authService.oauthExchange);
export const verifyTwoFactorUser = apiThunk("auth/verifyTwoFactor", authService.verifyTwoFactor);
export const resetPasswordUser = apiThunk("auth/resetPassword", authService.resetPassword);
export const updateProfile = apiThunk("auth/updateProfile", authService.updateProfile);
export const addAddress = apiThunk("auth/addAddress", authService.addAddress);
export const setDefaultAddress = apiThunk("auth/setDefaultAddress", authService.setDefaultAddress);
export const deleteAddress = apiThunk("auth/deleteAddress", authService.deleteAddress);
export const uploadProfileImage = apiThunk("auth/uploadImage", ({ kind, file }) => authService.uploadImage(kind, file));
export const removeProfileImage = apiThunk("auth/removeImage", authService.removeImage);

// Logout always clears the local session, even if the request fails.
export const logoutUser = apiThunk("auth/logout", () => authService.logout().catch(() => ({ data: {} })));
export const logoutAllUser = apiThunk("auth/logoutAll", () => authService.logoutAll().catch(() => ({ data: {} })));

// Loads the signed-in user. Only a real authentication failure ends the session. A network or server error
// keeps the saved login and is tried again, so a short outage or a sleeping server never signs anyone out.
const LOAD_ATTEMPTS = 3;
const LOAD_RETRY_MS = 2000;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const loadUser = createAsyncThunk("auth/loadUser", async (_, { rejectWithValue }) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const { data } = await authService.me();
      return data;
    } catch (error) {
      const sessionOver = isSessionError(error);
      if (sessionOver || attempt === LOAD_ATTEMPTS) return rejectWithValue({ message: getErrorMessage(error), sessionOver });
      await wait(LOAD_RETRY_MS);
    }
  }
});

const savedToken = getToken();

const initialState = {
  user: null,
  token: savedToken,
  sessionExpiresAt: savedToken ? getTokenExpiry(savedToken) : null,
  // Wait briefly for an open tab to share a temporary session before showing login or redirecting.
  initialized: false,
  loading: false,
  twoFactorSetupRequired: false,
  // True after a session ended without the person asking (expired, revoked, suspended, or the browser was closed
  // after a login without Remember Me). The session guard sends them to the home page, shows a notice and then resets it.
  sessionEnded: !savedToken && hadTemporaryLogin(),
};

const clearSession = (state, notifyOtherTabs = true) => {
  state.user = null;
  state.token = null;
  state.sessionExpiresAt = null;
  state.initialized = true;
  state.twoFactorSetupRequired = false;
  clearToken(notifyOtherTabs);
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    forceLogout: (state, { payload }) => {
      if (state.token || state.user) state.sessionEnded = true;
      clearSession(state, !payload?.remote);
    },
    sessionEndAcknowledged: (state) => {
      state.sessionEnded = false;
      clearTemporaryLoginMark();
    },
    // Another open tab shared its temporary login, so the login did not end.
    restoreTabSession: (state, { payload }) => {
      state.token = payload;
      state.sessionEnded = false;
      state.initialized = false;
    },
    setWishlistItem: (state, { payload }) => {
      if (!state.user) return;
      const current = state.user.wishlist || [];
      state.user.wishlist = payload.saved
        ? [...new Set([...current.map(String), String(payload.itemId)])]
        : current.filter((id) => String(id) !== String(payload.itemId));
    },
    // Used after two-factor setup and after a forced password change.
    setUser: (state, { payload }) => {
      state.user = payload;
      if (payload?.twoFactorEnabled) state.twoFactorSetupRequired = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUser.fulfilled, (state, { payload }) => {
        state.user = payload.user;
        state.sessionExpiresAt = payload.sessionExpiresAt
          ? new Date(payload.sessionExpiresAt).getTime()
          : (state.token ? getTokenExpiry(state.token) : state.sessionExpiresAt);
        state.twoFactorSetupRequired = Boolean(payload.twoFactorSetupRequired);
        state.initialized = true;
      })
      .addCase(loadUser.rejected, (state, { payload }) => {
        if (payload?.sessionOver) return clearSession(state);
        // The server could not be reached. The saved login stays, and reloading the page tries again.
        state.initialized = true;
        return undefined;
      })
      .addCase(logoutUser.fulfilled, clearSession)
      .addCase(logoutUser.rejected, clearSession)
      .addCase(logoutAllUser.fulfilled, clearSession)
      .addCase(logoutAllUser.rejected, clearSession)
      .addMatcher(
        isAnyOf(registerUser.fulfilled, loginUser.fulfilled, verifyTwoFactorUser.fulfilled, resetPasswordUser.fulfilled, oauthExchangeUser.fulfilled),
        (state, { payload }) => {
          // A login that still needs a two-factor code, or a reset that asks to sign in again, carries no session.
          if (!payload.token) return;
          state.user = payload.user;
          state.token = payload.token;
          state.sessionExpiresAt = getTokenExpiry(payload.token);
          state.twoFactorSetupRequired = Boolean(payload.twoFactorSetupRequired);
          state.initialized = true;
          state.sessionEnded = false;
          // Remember Me persists the login across tabs and browser restarts; otherwise open tabs share a temporary login.
          saveToken(payload.token, Boolean(payload.rememberMe));
        }
      )
      .addMatcher(
        isAnyOf(
          updateProfile.fulfilled,
          addAddress.fulfilled,
          setDefaultAddress.fulfilled,
          deleteAddress.fulfilled,
          uploadProfileImage.fulfilled,
          removeProfileImage.fulfilled
        ),
        (state, { payload }) => {
          state.user = payload.user;
        }
      )
      .addMatcher(
        isAnyOf(registerUser.pending, loginUser.pending, verifyTwoFactorUser.pending, resetPasswordUser.pending),
        (state) => {
          state.loading = true;
        }
      )
      .addMatcher(
        isAnyOf(
          registerUser.fulfilled, registerUser.rejected,
          loginUser.fulfilled, loginUser.rejected,
          verifyTwoFactorUser.fulfilled, verifyTwoFactorUser.rejected,
          resetPasswordUser.fulfilled, resetPasswordUser.rejected
        ),
        (state) => {
          state.loading = false;
        }
      );
  },
});

export const { forceLogout, sessionEndAcknowledged, restoreTabSession, setUser, setWishlistItem } = authSlice.actions;
export default authSlice.reducer;
