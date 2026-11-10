import User from "../models/User.js";
import Settings from "../models/Settings.js";
import sendEmail from "./sendEmail.js";
import { orderEmail } from "./emailTemplates.js";
import { notifyRoles } from "../services/notificationService.js";

// Emails the customer about an order event. Failures are logged and never thrown.
export const notifyOrder = async (order, event) => {
  try {
    const [user, settings] = await Promise.all([
      User.findById(order.user).select("name email"),
      Settings.getSettings(),
    ]);
    if (!user?.email) return;
    const { subject, html } = orderEmail({ order, user, settings, event });
    await sendEmail({ to: user.email, subject, html });
  } catch (error) {
    console.error(`Order notification failed: ${error.message}`);
  }
};

// Creates an in-app notification for the team when a confirmed order arrives.
// Cash orders call this at creation. Online orders call it after the payment is verified.
export const notifyTeamNewOrder = (order) =>
  notifyRoles(["SUPER_ADMIN", "ADMIN", "MANAGER"], {
    type: "new_order",
    title: `New order ${order.orderNumber}`,
    body: `${order.orderType} order, total Rs. ${Number(order.totalAmount).toFixed(2)}`,
    link: `/admin/orders/${order._id}`,
  });
