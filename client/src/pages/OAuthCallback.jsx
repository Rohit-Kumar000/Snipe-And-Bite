import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { oauthExchangeUser } from "../features/auth/authSlice";
import Loader from "../components/common/Loader";
import { isEmployee } from "../utils/roles";

// Landing page after a social sign-in. Swaps the one-time code for a session.
export default function OAuthCallback() {
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get("code");
    if (!code) { navigate("/login", { replace: true }); return; }
    dispatch(oauthExchangeUser(code)).unwrap()
      .then((payload) => {
        // 2FA is on: no session exists yet. Hand the challenge to the login page to collect the code.
        if (payload.requires2FA) { navigate("/login", { replace: true, state: { challenge: payload.challengeToken } }); return; }
        toast.success(`Welcome, ${payload.user.name.split(" ")[0]}`);
        navigate(isEmployee(payload.user) ? "/admin" : "/", { replace: true });
      })
      .catch((message) => { toast.error(message || "Sign-in failed"); navigate("/login", { replace: true }); });
  }, [dispatch, navigate, params]);

  return <Loader fullPage />;
}
