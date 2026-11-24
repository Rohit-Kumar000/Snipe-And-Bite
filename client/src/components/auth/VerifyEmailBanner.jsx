import { useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../services/api";

// Shown on the profile page until the customer confirms their email address.
export default function VerifyEmailBanner() {
  const user = useSelector((state) => state.auth.user);
  const [busy, setBusy] = useState(false);
  if (!user || user.emailVerified) return null;
  const send = async () => {
    setBusy(true);
    try { const { data } = await api.post("/auth/send-verification"); toast.success(data.message); } catch (e) { toast.error(getErrorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 p-4 text-sm" role="status">
      <p>Please confirm <b>{user.email}</b> so we can reach you about orders and password resets.</p>
      <button type="button" className="btn-primary btn-sm" onClick={send} disabled={busy}>{busy ? "Sending..." : "Send confirmation email"}</button>
    </div>
  );
}
