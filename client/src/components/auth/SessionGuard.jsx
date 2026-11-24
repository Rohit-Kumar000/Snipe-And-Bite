import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { forceLogout, sessionEndAcknowledged } from "../../features/auth/authSlice";
import { TOKEN_KEY, getToken, getTokenExpiry } from "../../services/sessionStore";
import { closeSocket } from "../../services/socket";

// Watches the login from outside the pages. It signs the person out when the 9 hours are over, follows a
// sign-out made in another tab, and sends them to the home page whenever a session ends without them asking.
export default function SessionGuard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, sessionExpiresAt, sessionEnded, initialized } = useSelector((state) => state.auth);

  // End the session at the moment its token expires.
  useEffect(() => {
    if (!token && !sessionExpiresAt) return undefined;
    const expiresAt = getTokenExpiry(token) || sessionExpiresAt;
    if (!expiresAt) return undefined;

    const end = () => dispatch(forceLogout());
    const endIfExpired = () => {
      if (Date.now() >= expiresAt) end();
    };
    const timer = setTimeout(end, Math.max(expiresAt - Date.now(), 0));
    // Timers pause while a laptop sleeps or a tab is hidden, so check again when the person comes back.
    document.addEventListener("visibilitychange", endIfExpired);
    window.addEventListener("focus", endIfExpired);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", endIfExpired);
      window.removeEventListener("focus", endIfExpired);
    };
  }, [token, sessionExpiresAt, dispatch]);

  // A sign-out in another tab removes the shared Remember Me login. This tab follows it.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === TOKEN_KEY && !getToken()) dispatch(forceLogout({ remote: true }));
    };
    const onSharedLogout = () => dispatch(forceLogout({ remote: true }));
    window.addEventListener("storage", onStorage);
    window.addEventListener("sb:session-ended", onSharedLogout);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sb:session-ended", onSharedLogout);
    };
  }, [dispatch]);

  // Without a login there is nothing to push live updates to.
  useEffect(() => {
    if (!token && !user) closeSocket();
  }, [token, user]);

  // After a session ends on its own, land on the home page and explain why.
  useEffect(() => {
    // Wait until the app has checked for a login shared by another open tab.
    if (!sessionEnded || !initialized) return;
    if (location.pathname !== "/") {
      navigate("/", { replace: true });
      return;
    }
    toast.error("Your session has ended. Please log in again.", { id: "session-ended" });
    dispatch(sessionEndAcknowledged());
  }, [sessionEnded, initialized, location.pathname, navigate, dispatch]);

  return null;
}
