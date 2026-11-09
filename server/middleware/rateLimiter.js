import rateLimit from "express-rate-limit";

const build = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

// Protects login, register and password reset from brute force attacks.
// The limit is relaxed in development so API testing is not blocked.
const isProduction = process.env.NODE_ENV === "production";
export const authLimiter = build(15, isProduction ? 20 : 500, "Too many attempts, please try again after 15 minutes");

// General limit for the whole API.
export const apiLimiter = build(15, 600, "Too many requests, please slow down");

// The public contact form is limited to a few messages per hour for each IP address.
export const contactLimiter = build(60, process.env.NODE_ENV === "production" ? 5 : 100, "Too many messages. Please try again later");

// Two-factor code checks get a stricter limit to stop code guessing.
export const twoFactorLimiter = build(15, process.env.NODE_ENV === "production" ? 10 : 200, "Too many verification attempts, please try again later");
