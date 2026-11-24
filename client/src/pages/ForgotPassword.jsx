import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import authService from "../features/auth/authService";
import { getErrorMessage } from "../services/api";
import Seo from "../components/common/Seo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword({ email });
      setSent(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page flex justify-center py-12">
      <Seo title="Forgot password" />
      <div className="card w-full max-w-md space-y-4 p-8">
        <h1 className="text-center text-2xl font-bold text-choco">Forgot your password?</h1>

        {sent ? (
          <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
            If an account exists for {email}, we have sent a link to reset the password. The link is valid for 15 minutes.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">Enter your email and we will send you a link to reset your password.</p>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm">
          <Link to="/login" className="font-semibold text-brand hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
