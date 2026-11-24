import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiLogOut, FiMonitor, FiShield } from "react-icons/fi";
import authService from "../../features/auth/authService";
import { logoutAllUser, setUser } from "../../features/auth/authSlice";
import { getErrorMessage } from "../../services/api";
import { timeAgo } from "../../utils/formatDate";
import TwoFactorSetup from "./TwoFactorSetup";
import Loader from "../common/Loader";
import PasswordInput from "../common/PasswordInput";

// Two-factor status, active sessions and "sign out everywhere". Shown on the profile and in the admin Security page.
export default function AccountSecurity() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [sessions, setSessions] = useState(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disable, setDisable] = useState({ open: false, password: "", code: "" });
  const mandatory = user.role === "SUPER_ADMIN";

  const loadSessions = useCallback(async () => {
    try {
      const { data } = await authService.listSessions();
      setSessions(data.sessions);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSessions();
  }, [loadSessions]);

  const revoke = async (id) => {
    try {
      await authService.revokeSession(id);
      toast.success("Device signed out");
      loadSessions();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const signOutEverywhere = async () => {
    await dispatch(logoutAllUser());
    toast.success("Signed out from all devices");
  };

  const disableTwoFactor = async (event) => {
    event.preventDefault();
    try {
      const { data } = await authService.twoFactorDisable({ password: disable.password, code: disable.code });
      dispatch(setUser(data.user));
      setDisable({ open: false, password: "", code: "" });
      toast.success("Two-factor authentication turned off");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-choco"><FiShield className="text-brand" /> Two-factor authentication</h2>
          <span className={`badge ${user.twoFactorEnabled ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {user.twoFactorEnabled ? "On" : "Off"}
          </span>
        </div>

        {user.twoFactorEnabled ? (
          <>
            <p className="text-sm text-gray-600">A code from your authenticator app is required every time you sign in.</p>
            {mandatory ? (
              <p className="text-xs text-gray-500">Two-factor authentication is mandatory for the Super Admin and cannot be turned off.</p>
            ) : disable.open ? (
              <form onSubmit={disableTwoFactor} className="space-y-3">
                <PasswordInput placeholder="Your password" value={disable.password} onChange={(e) => setDisable((d) => ({ ...d, password: e.target.value }))} required />
                <input className="input" inputMode="numeric" maxLength={6} placeholder="6 digit code" value={disable.code} onChange={(e) => setDisable((d) => ({ ...d, code: e.target.value.replace(/\D/g, "") }))} required />
                <div className="flex gap-2">
                  <button type="submit" className="btn-danger btn-sm">Turn off</button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setDisable({ open: false, password: "", code: "" })}>Cancel</button>
                </div>
              </form>
            ) : (
              <button type="button" className="btn-danger btn-sm" onClick={() => setDisable((d) => ({ ...d, open: true }))}>Turn off</button>
            )}
          </>
        ) : setupOpen ? (
          <TwoFactorSetup onDone={() => setSetupOpen(false)} />
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Add a second step to your sign in.{" "}
              {user.role === "ADMIN" ? "Recommended for every Admin account." : ""}
            </p>
            <button type="button" className="btn-primary btn-sm" onClick={() => setSetupOpen(true)}>Set up</button>
          </>
        )}
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-choco"><FiMonitor className="text-brand" /> Signed-in devices</h2>
          <button type="button" className="btn-danger btn-sm" onClick={signOutEverywhere}><FiLogOut /> Sign out everywhere</button>
        </div>
        {sessions === null ? (
          <Loader />
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No active sessions.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {sessions.map((session) => (
              <li key={session._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-choco">
                    {session.device || "Unknown device"}{" "}
                    {session.current && <span className="badge bg-green-100 text-green-700">This device</span>}
                  </p>
                  <p className="text-xs text-gray-500">{session.ip || "Unknown IP"} - active {timeAgo(session.lastSeenAt)}</p>
                </div>
                {!session.current && (
                  <button type="button" className="btn-ghost btn-sm" onClick={() => revoke(session._id)}>Sign out</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
