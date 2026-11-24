
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaGoogle, FaFacebookF, FaGithub, FaLinkedinIn } from "react-icons/fa";
import { FiCheck } from "react-icons/fi";
import api, { getErrorMessage } from "../../services/api";
import { loadUser } from "../../features/auth/authSlice";

const ICONS = {
  google: FaGoogle,
  facebook: FaFacebookF,
  github: FaGithub,
  linkedin: FaLinkedinIn,
};

// Lets a signed-in person connect an OAuth provider to their own account.
export default function ConnectedAccounts() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const linked = useSelector(
    (state) => state.auth.user?.linkedProviders || []
  );
  const role = useSelector((state) => state.auth.user?.role);

  const [providers, setProviders] = useState([]);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let active = true;

    api
      .get("/auth/oauth/providers")
      .then(({ data }) => {
        if (active) setProviders(data.providers);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const linkedProvider = params.get("linked");
    const linkError = params.get("linkError");

    if (linkedProvider) {
      toast.success(`${linkedProvider} connected`);
      dispatch(loadUser());
    }

    if (linkError) {
      toast.error(linkError);
    }

    if (linkedProvider || linkError) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, navigate, dispatch]);

  const connect = async (id) => {
    setBusy(id);

    try {
      const { data } = await api.post(`/auth/oauth/${id}/link-start`);

      if (!data.url) {
        throw new Error("OAuth authorization URL was not provided.");
      }

      window.location.assign(data.url);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setBusy("");
    }
  };

  if (providers.length === 0 || !role) return null;

  return (
    <section className="card p-5">
      <h2 className="font-semibold text-choco">Connected accounts</h2>

      <p className="mt-1 text-sm text-gray-500">
        Connect a provider to sign in with it. Two-step verification still
        applies if you have turned it on.
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {providers.map(({ id, label }) => {
          const Icon = ICONS[id];
          const isLinked = linked.includes(id);

          return (
            <li
              key={id}
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
              style={{ background: "var(--surface-2)" }}
            >
              <span className="flex items-center gap-2.5 text-sm font-medium">
                {Icon && <Icon />}
                {label}
              </span>

              {isLinked ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                  <FiCheck /> Connected
                </span>
              ) : (
                <button
                  type="button"
                  className="btn-dark btn-sm"
                  disabled={busy === id}
                  onClick={() => connect(id)}
                >
                  {busy === id ? "Opening..." : "Connect"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
