// Keeps the sign-in token in the place that matches the login the person chose.
//   Remember Me    -> localStorage. The login survives closing tabs or the browser until the token expires.
//   No Remember Me -> sessionStorage. Other open app tabs may request a copy; closing all tabs ends it.

export const TOKEN_KEY = "sb_token";
const CHANNEL_NAME = "sb_auth_session";
// Marks that a temporary (no Remember Me) login was started. If the browser is closed, the login is gone but this
// mark stays, so the next visit knows the login ended and can send the person to the home page to log in again.
const TEMP_LOGIN_KEY = "sb_temp_login";
const channel = typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel(CHANNEL_NAME)
  : null;

// Browsers can block storage (private mode, strict settings). A blocked read or write must never crash the app.
const safely = (action) => {
  try {
    return action();
  } catch {
    return null;
  }
};

// Reads the expiry time of a JWT in milliseconds without verifying it. The server stays the authority.
export const getTokenExpiry = (token) => {
  const payload = safely(() => JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))));
  return typeof payload?.exp === "number" ? payload.exp * 1000 : null;
};

export const hadTemporaryLogin = () => safely(() => localStorage.getItem(TEMP_LOGIN_KEY)) === "1";
export const clearTemporaryLoginMark = () => safely(() => localStorage.removeItem(TEMP_LOGIN_KEY));

export const clearToken = (notifyOtherTabs = true) => {
  safely(() => sessionStorage.removeItem(TOKEN_KEY));
  safely(() => localStorage.removeItem(TOKEN_KEY));
  clearTemporaryLoginMark();
  if (notifyOtherTabs) channel?.postMessage({ type: "logout" });
};

// Returns the saved token, or null when there is none or it has already expired.
export const getToken = () => {
  const token = safely(() => sessionStorage.getItem(TOKEN_KEY)) || safely(() => localStorage.getItem(TOKEN_KEY));
  if (!token) return null;
  const expiresAt = getTokenExpiry(token);
  if (expiresAt && expiresAt <= Date.now()) {
    clearToken();
    return null;
  }
  return token;
};

export const saveToken = (token, rememberMe) => {
  clearToken(false);
  safely(() => (rememberMe ? localStorage : sessionStorage).setItem(TOKEN_KEY, token));
  if (!rememberMe) safely(() => localStorage.setItem(TEMP_LOGIN_KEY, "1"));
};

// A non-remembered login lives in sessionStorage, then can be shared with other open tabs.
// Since no persistent copy exists, closing the last tab ends the login automatically.
export const requestOpenTabToken = () => new Promise((resolve) => {
  if (!channel) return resolve(null);
  const cached = getToken();
  if (cached) return resolve(cached);

  const requestId = `${Date.now()}-${Math.random()}`;
  const timeout = setTimeout(() => {
    channel.removeEventListener("message", onMessage);
    resolve(null);
  }, 250);
  const onMessage = (event) => {
    const message = event.data;
    if (message?.type === "token-response" && message.requestId === requestId && message.token) {
      clearTimeout(timeout);
      channel.removeEventListener("message", onMessage);
      const expiresAt = getTokenExpiry(message.token);
      if (expiresAt && expiresAt > Date.now()) {
        safely(() => sessionStorage.setItem(TOKEN_KEY, message.token));
        resolve(message.token);
      } else resolve(null);
    }
  };
  channel.addEventListener("message", onMessage);
  channel.postMessage({ type: "token-request", requestId });
});

channel?.addEventListener("message", (event) => {
  const message = event.data;
  if (message?.type === "token-request") {
    const token = safely(() => sessionStorage.getItem(TOKEN_KEY));
    if (token && getTokenExpiry(token) > Date.now()) {
      channel.postMessage({ type: "token-response", requestId: message.requestId, token });
    }
    return;
  }
  if (message?.type === "logout") window.dispatchEvent(new Event("sb:session-ended"));
});
