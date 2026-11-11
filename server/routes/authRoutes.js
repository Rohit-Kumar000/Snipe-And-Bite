import express from "express";
import { body } from "express-validator";
import {
  register, login, logout, logoutAll, getMe, forgotPassword, resetPassword, verifyTwoFactorLogin,
  listSessions, revokeOwnSession, sendVerification, verifyEmail, oauthExchange, setupTwoFactor, enableTwoFactor, disableTwoFactor, regenerateRecoveryCodes,
} from "../controllers/authController.js";
import { listProviders, startOAuth, startLink, oauthCallback } from "../controllers/oauthController.js";
import { protect } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import { authLimiter, twoFactorLimiter } from "../middleware/rateLimiter.js";
import { validatePasswordStrength } from "../utils/sessionPolicy.js";

const router = express.Router();

const emailRule = body("email").isEmail().withMessage("Valid email is required").normalizeEmail();
const passwordRule = body("password").custom((value) => {
  const problem = validatePasswordStrength(value);
  if (problem) throw new Error(problem);
  return true;
});

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  emailRule,
  body("phone")
    .optional({ values: "falsy" })
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Enter a valid 10 digit mobile number"),
  passwordRule,
];

const loginRules = [emailRule, body("password").notEmpty().withMessage("Password is required")];
const codeRule = body("code").trim().notEmpty().withMessage("Verification code is required");

router.post("/register", authLimiter, registerRules, validate, register);
router.post("/login", authLimiter, loginRules, validate, login);
router.post("/2fa/verify", twoFactorLimiter, [body("challengeToken").notEmpty(), codeRule], validate, verifyTwoFactorLogin);
router.post("/logout", logout);
router.post("/logout-all", protect, logoutAll);
router.get("/me", protect, getMe);
router.get("/sessions", protect, listSessions);
router.delete("/sessions/:id", protect, revokeOwnSession);
router.post("/forgot-password", authLimiter, [emailRule], validate, forgotPassword);
router.put("/reset-password/:token", authLimiter, [passwordRule], validate, resetPassword);

router.post("/send-verification", protect, authLimiter, sendVerification);
router.post("/verify-email/:token", authLimiter, verifyEmail);

// Social sign-in
router.get("/oauth/providers", listProviders);
router.post("/oauth/exchange", authLimiter, [body("code").notEmpty()], validate, oauthExchange);
router.get("/oauth/:provider", authLimiter, startOAuth);
router.get("/oauth/:provider/callback", oauthCallback);
router.post("/oauth/:provider/link-start", protect, authLimiter, startLink);

router.post("/2fa/setup", protect, twoFactorLimiter, setupTwoFactor);
router.post("/2fa/enable", protect, twoFactorLimiter, [codeRule], validate, enableTwoFactor);
router.post("/2fa/recovery-codes", protect, twoFactorLimiter, [codeRule], validate, regenerateRecoveryCodes);
router.post("/2fa/disable", protect, twoFactorLimiter, [codeRule], validate, disableTwoFactor);

export default router;
