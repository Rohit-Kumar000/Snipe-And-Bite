import crypto from "crypto";

let instance = null;

export const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

// Creates the Razorpay client on first use so the server can start without payment keys.
export const getRazorpay = async () => {
  if (!isRazorpayConfigured()) {
    const err = new Error("Online payments are not available right now");
    err.statusCode = 503;
    throw err;
  }
  if (!instance) {
    const { default: Razorpay } = await import("razorpay");
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
};

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a || ""));
  const bufB = Buffer.from(String(b || ""));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

// Verifies the signature returned by Razorpay Checkout after a successful payment.
export const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqual(expected, signature);
};

// Verifies the signature Razorpay sends with webhook calls (raw body is required).
export const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
};

// Tries to refund a captured payment. Returns true when Razorpay accepted the refund.
export const refundPayment = async (order) => {
  try {
    if (!order.razorpayPaymentId || !isRazorpayConfigured()) return false;
    const razorpay = await getRazorpay();
    await razorpay.payments.refund(order.razorpayPaymentId, {
      amount: Math.round(order.totalAmount * 100),
    });
    return true;
  } catch (error) {
    console.error(`Refund failed for ${order.orderNumber}: ${error.message}`);
    return false;
  }
};
