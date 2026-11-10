// Social sign-in provider settings. Pure functions, so they can be tested without network access.
export const PROVIDERS = {
  google: { label: "Google", authUrl: "https://accounts.google.com/o/oauth2/v2/auth", scope: "openid email profile", idEnv: "GOOGLE_CLIENT_ID", secretEnv: "GOOGLE_CLIENT_SECRET" },
  github: { label: "GitHub", authUrl: "https://github.com/login/oauth/authorize", scope: "read:user user:email", idEnv: "GITHUB_CLIENT_ID", secretEnv: "GITHUB_CLIENT_SECRET" },
  facebook: { label: "Facebook", authUrl: "https://www.facebook.com/v19.0/dialog/oauth", scope: "email,public_profile", idEnv: "FACEBOOK_APP_ID", secretEnv: "FACEBOOK_APP_SECRET" },
  linkedin: { label: "LinkedIn", authUrl: "https://www.linkedin.com/oauth/v2/authorization", scope: "openid profile email", idEnv: "LINKEDIN_CLIENT_ID", secretEnv: "LINKEDIN_CLIENT_SECRET" },
};

export const isProvider = (name) => Object.prototype.hasOwnProperty.call(PROVIDERS, name);

// A provider is offered only when every credential it needs is present.
export const isConfigured = (name, env = process.env) => {
  const p = PROVIDERS[name];
  return Boolean(p && env[p.idEnv] && env[p.secretEnv]);
};

export const configuredProviders = (env = process.env) => Object.keys(PROVIDERS).filter((name) => isConfigured(name, env));

export const callbackUrl = (name, env = process.env) => `${String(env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}/api/auth/oauth/${name}/callback`;

export const buildAuthUrl = (name, { state, env = process.env }) => {
  const p = PROVIDERS[name];
  const params = new URLSearchParams({ client_id: env[p.idEnv], redirect_uri: callbackUrl(name, env), response_type: "code", scope: p.scope, state, ...(p.extraParams || {}) });
  return `${p.authUrl}?${params.toString()}`;
};

// Decides what to do with a provider profile. Pure so every rule can be tested.
//  existingByProvider: user already linked to this provider id
//  existingByEmail:    user found only by the provider's email
// A verified provider may link to any existing account with the same email.
export const decideAccountAction = ({ profile, existingByProvider, existingByEmail }) => {
  if (existingByProvider) {
    if (existingByProvider.isBlocked) return { action: "reject", reason: "Your account is suspended. Please contact support" };
    return { action: "login" };
  }
  if (!profile.email || !profile.emailVerified) {
    return { action: "reject", reason: "That provider did not share a confirmed email address" };
  }
  if (existingByEmail) {
    if (existingByEmail.isBlocked) return { action: "reject", reason: "Your account is suspended. Please contact support" };
    return { action: "link-account" };
  }
  return { action: "create-customer" };
};

// Social sign-in only creates an account from the Sign up page. The Login page signs in people who are
// already registered, and anyone else is asked to sign up first.
export const normalizeAuthMode = (mode) => (mode === "signup" ? "signup" : "login");

export const applyAuthMode = (decision, mode) => {
  if (decision.action === "reject") return decision;
  if (normalizeAuthMode(mode) === "signup") {
    if (decision.action === "create-customer") return decision;
    return { action: "reject", reason: "This account is already registered. Please log in", to: "login" };
  }
  if (decision.action === "create-customer") {
    return { action: "reject", reason: "No account found for this email. Please sign up first", to: "register" };
  }
  return decision;
};
