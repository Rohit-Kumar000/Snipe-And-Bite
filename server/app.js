import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { razorpayWebhook } from "./controllers/paymentController.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import comboRoutes from "./routes/comboRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import hrRoutes from "./routes/hrRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

const app = express();

// Needed on Render and other proxies so rate limiting sees the real client IP.
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header (Postman, server to server) are allowed.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const error = new Error("Not allowed by CORS");
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
  })
);

// The Razorpay webhook must receive the raw body so its signature can be verified.
app.post("/api/payment/webhook", express.raw({ type: "application/json" }), razorpayWebhook);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ success: true, message: "Snipe&Bite API is running" });
});
app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok", time: new Date().toISOString() });
});

app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/combos", comboRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/reports", reportRoutes);

// Error handlers must always be registered last.
app.use(notFound);
app.use(errorHandler);

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

export { allowedOrigins };
export default app;
