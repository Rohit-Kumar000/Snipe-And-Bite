import { useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { FiCopy, FiDownload, FiShield } from "react-icons/fi";
import authService from "../../features/auth/authService";
import { setUser } from "../../features/auth/authSlice";
import { getErrorMessage } from "../../services/api";

// Three steps: create a secret, confirm one code from the authenticator app, then save the recovery codes.
export default function TwoFactorSetup({ onDone }) {
  const dispatch = useDispatch();
  const [secretInfo, setSecretInfo] = useState(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const { data } = await authService.twoFactorSetup();
      setSecretInfo(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await authService.twoFactorEnable(code);
      setRecoveryCodes(data.recoveryCodes);
      dispatch(setUser(data.user));
      toast.success("Two-factor authentication is on");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast.success("Recovery codes copied");
  };

  const downloadCodes = () => {
    const blob = new Blob([`Snipe&Bite recovery codes\nEach code works once.\n\n${recoveryCodes.join("\n")}\n`], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "snipe-and-bite-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (recoveryCodes) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Save these recovery codes somewhere safe. Each code works once and is the only way in if you lose your phone.
          They are shown only now.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-2xl p-4 font-mono text-sm" style={{ background: "var(--surface-2)" }}>
          {recoveryCodes.map((item) => <span key={item}>{item}</span>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-dark btn-sm" onClick={copyCodes}><FiCopy /> Copy</button>
          <button type="button" className="btn-dark btn-sm" onClick={downloadCodes}><FiDownload /> Download</button>
          <button type="button" className="btn-primary btn-sm" onClick={onDone}>I have saved them</button>
        </div>
      </div>
    );
  }

  if (!secretInfo) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Use an authenticator app such as Google Authenticator or Authy.
          You will scan a QR code and confirm one 6 digit code.
        </p>
        <button type="button" className="btn-primary" onClick={start} disabled={busy}>
          <FiShield /> {busy ? "Preparing..." : "Start setup"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="space-y-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="rounded-2xl bg-white p-3 shadow">
          <QRCodeSVG value={secretInfo.otpauthUrl} size={176} bgColor="#ffffff" fgColor="#1f1d2b" />
        </div>
        <div className="min-w-0 space-y-2 text-sm text-gray-600">
          <p>1. Scan the QR code with your authenticator app.</p>
          <p>2. Cannot scan? Enter this key manually:</p>
          <code className="block break-all rounded-lg px-3 py-2 font-mono text-xs" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>{secretInfo.secret}</code>
          <p>3. Type the 6 digit code the app shows.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input className="input max-w-44 text-center font-mono tracking-[0.4em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" required autoComplete="one-time-code" />
        <button type="submit" className="btn-primary" disabled={busy || code.length !== 6}>Turn on</button>
      </div>
    </form>
  );
}
