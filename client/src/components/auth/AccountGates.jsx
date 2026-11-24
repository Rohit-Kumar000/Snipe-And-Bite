import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiLock, FiShield } from "react-icons/fi";
import authService from "../../features/auth/authService";
import { loadUser, logoutUser } from "../../features/auth/authSlice";
import { getErrorMessage } from "../../services/api";
import PasswordInput from "../common/PasswordInput";
import TwoFactorSetup from "./TwoFactorSetup";

const Shell = ({ icon: Icon, title, children }) => (
  <div className="container-page flex justify-center py-12">
    <div className="card w-full max-w-lg space-y-5 p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand"><Icon size={22} /></span>
        <h1 className="text-2xl font-bold text-choco">{title}</h1>
      </div>
      {children}
    </div>
  </div>
);

// Shown instead of the admin panel until the Super Admin has finished two-factor setup.
export function TwoFactorRequiredGate() {
  const dispatch = useDispatch();
  return (
    <Shell icon={FiShield} title="Secure your Super Admin account">
      <p className="text-sm text-gray-600">Two-factor authentication is mandatory for the Super Admin. Finish this setup to continue.</p>
      <TwoFactorSetup onDone={() => dispatch(loadUser())} />
      <button type="button" className="btn-ghost btn-sm" onClick={() => dispatch(logoutUser())}>Sign out</button>
    </Shell>
  );
}

// Shown when an administrator has required this person to choose a new password.
export function PasswordChangeGate() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirm) return toast.error("New passwords do not match");
    setBusy(true);
    try {
      await authService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success("Password changed");
      dispatch(loadUser());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell icon={FiLock} title="Choose a new password">
      <p className="text-sm text-gray-600">Hello {user.name}. You need to change your password before you continue.</p>
      <form onSubmit={submit} className="space-y-4">
        <PasswordInput placeholder="Current password" value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} required autoComplete="current-password" />
        <PasswordInput placeholder="New password (8+ characters, letters and numbers)" minLength={8} value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} required autoComplete="new-password" />
        <PasswordInput placeholder="Confirm new password" minLength={8} value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} required autoComplete="new-password" />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving..." : "Update password"}</button>
          <button type="button" className="btn-ghost" onClick={() => dispatch(logoutUser())}>Sign out</button>
        </div>
      </form>
    </Shell>
  );
}
