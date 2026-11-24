import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { resetPasswordUser } from "../features/auth/authSlice";
import Seo from "../components/common/Seo";
import PasswordInput from "../components/common/PasswordInput";

export default function ResetPassword() {
  const { token } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector((state) => state.auth.loading);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    try {
      const payload = await dispatch(resetPasswordUser({ token, password })).unwrap();
      if (payload.token) {
        toast.success("Password updated. You are now logged in.");
        navigate("/", { replace: true });
      } else {
        // Employee and two-factor accounts always sign in again so verification is never skipped.
        toast.success("Password updated. Please sign in.");
        navigate("/login", { replace: true });
      }
    } catch (message) {
      toast.error(message);
    }
  };

  return (
    <div className="container-page flex justify-center py-12">
      <Seo title="Reset password" />
      <form onSubmit={handleSubmit} className="card w-full max-w-md space-y-4 p-8">
        <h1 className="text-center text-2xl font-bold text-choco">Set a new password</h1>
        <p className="text-center text-xs text-gray-500">At least 8 characters, with letters and numbers.</p>
        <div>
          <label className="label" htmlFor="password">New password</label>
          <PasswordInput id="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm password</label>
          <PasswordInput id="confirm" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? "Saving..." : "Update password"}
        </button>
        <p className="text-center text-sm">
          <Link to="/login" className="font-semibold text-brand hover:underline">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
