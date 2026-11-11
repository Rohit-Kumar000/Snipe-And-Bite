import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ROLES } from "../utils/permissions.js";
import { PROVIDERS, isProvider, isConfigured, configuredProviders, buildAuthUrl, callbackUrl, decideAccountAction, applyAuthMode, normalizeAuthMode } from "../utils/oauthProviders.js";
import { logAudit } from "../services/auditService.js";
import { importProviderPhoto, needsOwnPhoto } from "../services/photoService.js";

const clientUrl = () => (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim();
const failTo = (res, message, page = "login") => res.redirect(`${clientUrl()}/${page}?oauthError=${encodeURIComponent(message)}`);
const isProd = () => process.env.NODE_ENV === "production";

const postForm = async (url, body, headers = {}) => {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...headers }, body: new URLSearchParams(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error_description || data.error || `Provider returned ${res.status}`);
  return data;
};
const getJson = async (url, token) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "User-Agent": "SnipeAndBite" } });
  if (!res.ok) throw new Error(`Provider returned ${res.status}`);
  return res.json();
};

// Fetches the person's profile from the provider: { id, email, emailVerified, name, picture }.
const fetchProfile = async (provider, code) => {
  const redirect_uri = callbackUrl(provider);
  const { idEnv, secretEnv } = PROVIDERS[provider];

  if (provider === "google") {
    const t = await postForm("https://oauth2.googleapis.com/token", { code, client_id: process.env[idEnv], client_secret: process.env[secretEnv], redirect_uri, grant_type: "authorization_code" });
    const u = await getJson("https://openidconnect.googleapis.com/v1/userinfo", t.access_token);
    return { id: u.sub, email: u.email, emailVerified: Boolean(u.email_verified), name: u.name, picture: u.picture };
  }
  if (provider === "github") {
    const t = await postForm("https://github.com/login/oauth/access_token", { code, client_id: process.env[idEnv], client_secret: process.env[secretEnv], redirect_uri });
    const u = await getJson("https://api.github.com/user", t.access_token);
    const emails = await getJson("https://api.github.com/user/emails", t.access_token);
    const primary = emails.find((e) => e.primary && e.verified);
    return { id: String(u.id), email: primary?.email, emailVerified: Boolean(primary), name: u.name || u.login, picture: u.avatar_url };
  }
  if (provider === "facebook") {
    const t = await postForm("https://graph.facebook.com/v19.0/oauth/access_token", { code, client_id: process.env[idEnv], client_secret: process.env[secretEnv], redirect_uri });
    const u = await getJson("https://graph.facebook.com/me?fields=id,name,email,picture.type(large)", t.access_token);
    // Facebook only returns an email it has confirmed.
    return { id: u.id, email: u.email, emailVerified: Boolean(u.email), name: u.name, picture: u.picture?.data?.url };
  }
  // linkedin (Sign In with LinkedIn using OpenID Connect)
  const t = await postForm("https://www.linkedin.com/oauth/v2/accessToken", { code, client_id: process.env[idEnv], client_secret: process.env[secretEnv], redirect_uri, grant_type: "authorization_code" });
  const u = await getJson("https://api.linkedin.com/v2/userinfo", t.access_token);
  return { id: u.sub, email: u.email, emailVerified: u.email_verified === true || u.email_verified === "true", name: u.name || [u.given_name, u.family_name].filter(Boolean).join(" "), picture: u.picture };
};

// GET /api/auth/oauth/providers  which sign-in buttons the website should show
export const listProviders = (req, res) => {
  res.json({ success: true, providers: configuredProviders().map((id) => ({ id, label: PROVIDERS[id].label })) });
};

const makeState = (provider, extra = {}) => {
  const nonce = crypto.randomBytes(16).toString("hex");
  return { nonce, state: jwt.sign({ p: provider, n: nonce, ...extra }, process.env.JWT_SECRET, { expiresIn: "10m" }) };
};
const setNonceCookie = (res, nonce) => res.cookie("oauth_nonce", nonce, { httpOnly: true, secure: isProd(), sameSite: "lax", maxAge: 10 * 60 * 1000 });

// GET /api/auth/oauth/:provider  sends the browser to the provider's consent screen
export const startOAuth = (req, res) => {
  const { provider } = req.params;
  if (!isProvider(provider) || !isConfigured(provider)) return failTo(res, "This sign-in method is not available");
  const { nonce, state } = makeState(provider, { m: normalizeAuthMode(req.query.mode), r: req.query.remember === "1" });
  setNonceCookie(res, nonce);
  return res.redirect(buildAuthUrl(provider, { state }));
};

// POST /api/auth/oauth/:provider/link-start (signed in)  returns the provider URL that connects it to the current account
export const startLink = (req, res) => {
  const { provider } = req.params;
  if (!isProvider(provider) || !isConfigured(provider)) return res.status(400).json({ success: false, message: "This sign-in method is not available" });
  const { nonce, state } = makeState(provider, { link: String(req.user._id), back: req.user.role === "CUSTOMER" ? "/profile" : "/admin/security" });
  setNonceCookie(res, nonce);
  return res.json({ success: true, url: buildAuthUrl(provider, { state }) });
};

// GET /api/auth/oauth/:provider/callback
export const oauthCallback = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const params = req.query;
  if (!isProvider(provider) || !isConfigured(provider)) return failTo(res, "This sign-in method is not available");
  if (params.error) return failTo(res, "Sign-in was cancelled");

  let state;
  try {
    state = jwt.verify(String(params.state || ""), process.env.JWT_SECRET);
  } catch {
    return failTo(res, "Sign-in expired. Please try again");
  }
  const nonce = req.headers.cookie?.match(/(?:^|;\s*)oauth_nonce=([^;]+)/)?.[1];
  if (state.p !== provider || nonce !== state.n) return failTo(res, "Sign-in failed. Please try again");
  res.clearCookie("oauth_nonce");

  let profile;
  try {
    profile = await fetchProfile(provider, String(params.code || ""));
  } catch (error) {
    console.error(`OAuth ${provider} failed: ${error.message}`);
    return failTo(res, "We could not complete sign-in with that provider");
  }
  if (!profile.id) return failTo(res, "We could not complete sign-in with that provider");

  const withProvider = { oauth: { $elemMatch: { provider, providerId: profile.id } } };

  // Connecting a provider to the signed-in account (done from the profile or security page).
  if (state.link) {
    const linkedAccount = await User.findById(state.link).select("role isBlocked");
    if (!linkedAccount || linkedAccount.isBlocked) return failTo(res, "Account not found");
    const owner = await User.findOne(withProvider).select("_id");
    if (owner && String(owner._id) !== state.link) return res.redirect(`${clientUrl()}${state.back}?linkError=${encodeURIComponent("That account is already connected to another user")}`);
    const me = await User.findById(state.link);
    if (!me || me.isBlocked) return failTo(res, "Account not found");
    if (me.oauth.some((entry) => entry.provider === provider && entry.providerId !== profile.id)) {
      return res.redirect(`${clientUrl()}${state.back}?linkError=${encodeURIComponent("A different account from this provider is already connected")}`);
    }
    if (!me.oauth.some((o) => o.provider === provider)) me.oauth.push({ provider, providerId: profile.id });
    if (needsOwnPhoto(me) && profile.picture) me.avatar = (await importProviderPhoto(profile.picture)) || me.avatar;
    await me.save({ validateBeforeSave: false });
    await logAudit(req, { actor: me, action: "OAUTH_LINKED", resourceType: "User", resourceId: me._id, summary: `${me.name} connected ${PROVIDERS[provider].label}` });
    return res.redirect(`${clientUrl()}${state.back}?linked=${provider}`);
  }

  const [existingByProvider, existingByEmail] = await Promise.all([
    User.findOne(withProvider).select("+oauthJti"),
    profile.email ? User.findOne({ email: profile.email.toLowerCase() }).select("+oauthJti") : null,
  ]);
  const decision = applyAuthMode(decideAccountAction({ profile, existingByProvider, existingByEmail }), state.m);
  if (decision.action === "reject") return failTo(res, decision.reason, decision.to);

  let user = decision.action === "link-account" ? existingByEmail : existingByProvider;
  if (decision.action === "link-account") {
    const ownsProvider = await User.findOne(withProvider).select("_id");
    if (ownsProvider && String(ownsProvider._id) !== String(user._id)) return failTo(res, "That provider account is already connected to another user");
    if (user.oauth.some((entry) => entry.provider === provider && entry.providerId !== profile.id)) {
      return failTo(res, "A different account from this provider is already connected");
    }
    if (!user.oauth.some((entry) => entry.provider === provider)) user.oauth.push({ provider, providerId: profile.id });
    user.emailVerified = true;
    await user.save({ validateBeforeSave: false });
    await logAudit(req, { actor: user, action: "OAUTH_LINKED", resourceType: "User", resourceId: user._id, summary: `${user.name} connected ${PROVIDERS[provider].label}` });
  } else if (decision.action === "create-customer") {
    user = new User({
      name: String(profile.name || profile.email.split("@")[0]).slice(0, 50),
      email: profile.email.toLowerCase(),
      password: crypto.randomBytes(32).toString("hex"),
      role: ROLES.CUSTOMER,
      emailVerified: true,
      oauth: [{ provider, providerId: profile.id }],
    });
  }

  // Every sign-in makes sure the account has a picture of its own that loads in the admin panel and the website.
  if (needsOwnPhoto(user) && profile.picture) user.avatar = (await importProviderPhoto(profile.picture)) || user.avatar;

  const jti = crypto.randomBytes(16).toString("hex");
  user.oauthJti = jti;
  await user.save({ validateBeforeSave: false });
  const code = jwt.sign({ id: user._id, purpose: "oauth-exchange", jti, rm: Boolean(state.r) }, process.env.JWT_SECRET, { expiresIn: "60s" });
  return res.redirect(`${clientUrl()}/oauth/callback?code=${encodeURIComponent(code)}`);
});
