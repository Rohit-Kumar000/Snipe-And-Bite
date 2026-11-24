import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiShield } from "react-icons/fi";
import { loginUser, verifyTwoFactorUser } from "../features/auth/authSlice";
import { isEmployee } from "../utils/roles";
import Logo from "../components/common/Logo";
import Seo from "../components/common/Seo";
import PasswordInput from "../components/common/PasswordInput";
import SocialLogin from "../components/auth/SocialLogin";
import Loader from "../components/common/Loader";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, initialized, user } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
  const [challenge, setChallenge] = useState(location.state?.challenge || null);
  const [code, setCode] = useState("");

  // A failed social sign-in sends the person back here with the reason in the address.
  useEffect(() => {
    const reason = new URLSearchParams(location.search).get("oauthError");
    if (reason) {
      toast.error(reason, { id: "oauth-error" });
      navigate("/login", { replace: true, state: location.state });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  const finish = (user) => {
    toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
    const from = location.state?.from;
    navigate(from || (isEmployee(user) ? "/admin" : "/"), { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = await dispatch(loginUser(form)).unwrap();
      if (payload.requires2FA) {
        setChallenge(payload.challengeToken);
        return;
      }
      finish(payload.user);
    } catch (message) {
      toast.error(message);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    try {
      const { user } = await dispatch(verifyTwoFactorUser({ challengeToken: challenge, code })).unwrap();
      finish(user);
    } catch (message) {
      toast.error(message);
    }
  };

  if (!initialized) return <Loader fullPage />;
  if (user) return <Navigate to={location.state?.from || (isEmployee(user) ? "/admin" : "/")} replace />;

  return (
    <div className="relative flex justify-center overflow-hidden px-4 py-14">
      <Seo title="Login" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />

      {challenge ? (
        <form onSubmit={handleVerify} className="card animate-fade-up relative w-full max-w-md space-y-5 p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-brand"><FiShield size={26} /></div>
          <h1 className="text-center text-2xl font-bold text-choco">Two-step verification</h1>
          <p className="text-center text-sm text-gray-500">Enter the 6 digit code from your authenticator app, or one of your recovery codes.</p>
          <input className="input text-center font-mono text-lg tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" required autoFocus autoComplete="one-time-code" />
          <button type="submit" className="btn-primary w-full py-3" disabled={loading || !code.trim()}>
            {loading ? "Verifying..." : "Verify and sign in"}
          </button>
          <button type="button" className="btn-ghost w-full" onClick={() => { setChallenge(null); setCode(""); }}>Back</button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="card animate-fade-up relative w-full max-w-md space-y-4 p-8">
          <Logo className="mx-auto h-16 w-auto" />
          <h1 className="text-center text-2xl font-bold text-choco">Welcome back</h1>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={form.email} onChange={handleChange("email")} required autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <PasswordInput id="password" value={form.password} onChange={handleChange("password")} required autoComplete="current-password" />
            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input type="checkbox" className="accent-brand" checked={form.rememberMe} onChange={(e) => setForm((f) => ({ ...f, rememberMe: e.target.checked }))} />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-xs font-medium text-brand hover:underline">Forgot password?</Link>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
          <p className="text-center text-sm text-gray-600">
            New here? <Link to="/register" state={location.state} className="font-semibold text-brand hover:underline">Create an account</Link>
          </p>
          <SocialLogin mode="login" rememberMe={form.rememberMe} />
        </form>
      )}
    </div>
  );
}
