import { useEffect, useState } from "react";
import { FaGoogle, FaFacebookF, FaLinkedinIn, FaGithub } from "react-icons/fa";
import api from "../../services/api";

const ICONS = { google: FaGoogle, github: FaGithub, facebook: FaFacebookF, linkedin: FaLinkedinIn };

// Shows a button only for the providers the server has credentials for, so no button is ever dead.
export default function SocialLogin({ mode = "login", rememberMe = false }) {
  const [providers, setProviders] = useState([]);
  useEffect(() => {
    let alive = true;
    api.get("/auth/oauth/providers").then(({ data }) => alive && setProviders(data.providers)).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (providers.length === 0) return null;
  const base = api.defaults.baseURL;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        <span className="h-px flex-1" style={{ background: "var(--line-strong)" }} />{mode === "signup" ? "or sign up with" : "or log in with"}<span className="h-px flex-1" style={{ background: "var(--line-strong)" }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {providers.map(({ id, label }) => {
          const Icon = ICONS[id];
          return (
            <a key={id} href={`${base}/auth/oauth/${id}?mode=${mode}${rememberMe ? "&remember=1" : ""}`} className="flex items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-sm font-medium transition hover:border-brand hover:text-brand" style={{ borderColor: "var(--line-strong)" }}>
              <Icon /> {label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
