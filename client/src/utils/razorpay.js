import api from "../services/api";

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

const loadScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Could not load the payment window. Check your internet connection."));
    document.body.appendChild(script);
  });

// Opens Razorpay Checkout for an existing online order.
// Resolves with { paid: true, order } after verification, or { paid: false } if the window is closed without paying.
export const payForOrder = async (order, user) => {
  await loadScript();

  const { data: payment } = await api.post("/payment/create-order", { orderId: order._id });

  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      order_id: payment.razorpayOrderId,
      name: "Snipe&Bite",
      description: `Order ${order.orderNumber}`,
      prefill: { name: user?.name, email: user?.email, contact: order.contact?.phone },
      theme: { color: "#e31b23" },
      handler: async (response) => {
        try {
          const { data } = await api.post("/payment/verify", response);
          resolve({ paid: true, order: data.order });
        } catch (error) {
          reject(error);
        }
      },
      modal: { ondismiss: () => resolve({ paid: false }) },
    });
    razorpay.open();
  });
};
