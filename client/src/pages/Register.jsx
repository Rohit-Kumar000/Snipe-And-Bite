import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { registerUser } from "../features/auth/authSlice";
import Logo from "../components/common/Logo";
import SocialLogin from "../components/auth/SocialLogin";
import PasswordInput from "../components/common/PasswordInput";
import Seo from "../components/common/Seo";
import Loader from "../components/common/Loader";

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, initialized, user } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });

  // A social sign-up that could not finish sends the person back here with the reason in the address.
  useEffect(() => {
    const reason = new URLSearchParams(location.search).get("oauthError");
    if (reason) {
      toast.error(reason, { id: "oauth-error" });
      navigate("/register", { replace: true, state: location.state });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) return toast.error("Enter a valid 10 digit mobile number");

    try {
      const body = { name: form.name, email: form.email, phone: form.phone, password: form.password };
      const { user } = await dispatch(registerUser(body)).unwrap();
      toast.success(`Welcome, ${user.name.split(" ")[0]}`);
      navigate(location.state?.from || "/", { replace: true });
    } catch (message) {
      toast.error(message);
    }
  };

  if (!initialized) return <Loader fullPage />;
  if (user) return <Navigate to={location.state?.from || "/"} replace />;

  return (
    <div className="container-page flex justify-center py-12">
      <Seo title="Create account" />
      <form onSubmit={handleSubmit} className="card w-full max-w-md space-y-4 p-8">
        <Logo className="mx-auto h-16 w-auto" />
        <h1 className="text-center text-2xl font-bold text-choco">Create your account</h1>

        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="input" value={form.name} onChange={handleChange("name")} required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={form.email} onChange={handleChange("email")} required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Mobile number (optional)</label>
          <input
            id="phone"
            className="input"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
            autoComplete="tel"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">Password</label>
            <PasswordInput id="password" minLength={8} value={form.password} onChange={handleChange("password")} required autoComplete="new-password" />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm</label>
            <PasswordInput id="confirm" minLength={8} value={form.confirm} onChange={handleChange("confirm")} required autoComplete="new-password" />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
        <p className="text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" state={location.state} className="font-semibold text-brand hover:underline">Login</Link>
        </p>
        <SocialLogin mode="signup" />
      </form>
    </div>
  );
}
