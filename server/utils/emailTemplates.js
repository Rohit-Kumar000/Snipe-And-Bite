const BRAND = "#e31b23";
const DARK = "#4a1d0a";

// Escapes values before they are placed inside HTML.
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (n) => `Rs. ${Number(n).toFixed(2)}`;

const layout = (restaurantName, title, body) => `
<div style="background:#fffbf5;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee">
    <div style="background:${BRAND};color:#fff;padding:18px 24px;font-size:20px;font-weight:700">${esc(restaurantName)}</div>
    <div style="padding:24px">
      <h2 style="margin:0 0 12px;color:${DARK};font-size:20px">${esc(title)}</h2>
      ${body}
    </div>
    <div style="padding:14px 24px;background:#faf5ee;color:#777;font-size:12px">This is an automated message from ${esc(restaurantName)}.</div>
  </div>
</div>`;

const STATUS_COPY = {
  placed: {
    subject: "Order placed",
    title: "We have received your order",
    text: "Thank you for ordering. We will confirm it shortly.",
  },
  confirmed: {
    subject: "Order confirmed",
    title: "Your order is confirmed",
    text: "The kitchen has accepted your order.",
  },
  preparing: {
    subject: "Order is being prepared",
    title: "Your food is being prepared",
    text: "Our chefs are working on your order.",
  },
  ready: {
    subject: "Order is ready",
    title: "Your order is ready",
    text: "Your order is ready for pickup or serving.",
  },
  out_for_delivery: {
    subject: "Order is out for delivery",
    title: "Your order is on the way",
    text: "Our delivery partner is on the way to you.",
  },
  delivered: {
    subject: "Order delivered",
    title: "Enjoy your meal",
    text: "Your order has been delivered. We hope you love it.",
  },
  cancelled: {
    subject: "Order cancelled",
    title: "Your order was cancelled",
    text: "Your order has been cancelled. If you paid online, the refund will be processed to your original payment method.",
  },
};

// Builds the email for an order event (placed, confirmed, delivered, and so on).
export const orderEmail = ({ order, user, settings, event }) => {
  const copy = STATUS_COPY[event] || STATUS_COPY.placed;
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:6px 0">${esc(i.name)}${i.addOns?.length ? `<br><small style="color:#777">+ ${i.addOns.map((a) => esc(a.name)).join(", ")}</small>` : ""}</td>
        <td style="padding:6px 0;text-align:center">x${i.qty}</td>
        <td style="padding:6px 0;text-align:right">${money(i.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const body = `
    <p style="margin:0 0 12px">Hi ${esc(user.name)}, ${esc(copy.text)}</p>
    <p style="margin:0 0 12px"><strong>Order number:</strong> ${esc(order.orderNumber)}<br>
    <strong>Type:</strong> ${esc(order.orderType)} &nbsp; <strong>Payment:</strong> ${esc(order.paymentMethod)} (${esc(order.paymentStatus)})</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;border-top:1px solid #eee;border-bottom:1px solid #eee">${rows}</table>
    <p style="margin:12px 0 0;text-align:right;font-size:16px"><strong>Total: ${money(order.totalAmount)}</strong></p>
    ${settings.phone ? `<p style="margin:16px 0 0;color:#555">Need help? Call us at ${esc(settings.phone)}.</p>` : ""}`;

  return {
    subject: `${copy.subject} - ${order.orderNumber}`,
    html: layout(settings.restaurantName, copy.title, body),
  };
};

// Builds the password reset email.
export const resetPasswordEmail = ({ user, resetUrl, settings }) => ({
  subject: "Reset your password",
  html: layout(
    settings.restaurantName,
    "Reset your password",
    `<p>Hi ${esc(user.name)}, we received a request to reset your password.</p>
     <p><a href="${esc(resetUrl)}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">Reset password</a></p>
     <p style="color:#777;font-size:13px">This link is valid for 15 minutes. If you did not request this, you can ignore this email.</p>`
  ),
});

// Email address confirmation link.
export const verifyEmailTemplate = ({ user, verifyUrl, settings }) => ({
  subject: "Confirm your email address",
  html: layout(
    settings.restaurantName,
    "Confirm your email",
    `<p>Hi ${esc(user.name)}, please confirm this email address for your account.</p>
     <p><a href="${esc(verifyUrl)}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">Confirm email</a></p>
     <p style="color:#777;font-size:13px">This link is valid for 24 hours. If you did not create this account, you can ignore this email.</p>`
  ),
});

// Invitation email for a new team member. The link lets them choose their own password.
export const staffInviteEmail = ({ user, setupUrl, settings, invitedBy }) => ({
  subject: `You have been invited to ${settings.restaurantName}`,
  html: layout(
    settings.restaurantName,
    `Welcome to the team, ${user.name}`,
    `<p style="margin:0 0 12px">${esc(invitedBy)} created a <b>${esc(user.role)}</b> account for you.</p>
     <p style="margin:0 0 16px">Use the button below to choose your password. The link works once and expires in 24 hours.</p>
     <p><a href="${esc(setupUrl)}" style="background:${BRAND};color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;display:inline-block">Set my password</a></p>`
  ),
});

// Email sent to the restaurant owner when someone submits the contact form.
export const contactOwnerEmail = ({ message, settings }) => ({
  subject: `New message from ${String(message.name).replace(/[\r\n]+/g, " ").slice(0, 60)}: ${String(message.subject).replace(/[\r\n]+/g, " ").slice(0, 80)}`,
  html: layout(
    settings.restaurantName,
    "New contact form message",
    `<table style="width:100%;border-collapse:collapse;font-size:14px">
       <tr><td style="padding:6px 0;color:#777;width:90px">Name</td><td>${esc(message.name)}</td></tr>
       <tr><td style="padding:6px 0;color:#777">Email</td><td>${esc(message.email)}</td></tr>
       <tr><td style="padding:6px 0;color:#777">Phone</td><td>${esc(message.phone || "Not given")}</td></tr>
       <tr><td style="padding:6px 0;color:#777">Subject</td><td>${esc(message.subject)}</td></tr>
     </table>
     <div style="margin-top:14px;padding:14px;background:#faf5ee;border-radius:12px;white-space:pre-wrap;font-size:14px">${esc(message.message)}</div>
     <p style="margin-top:14px;color:#777;font-size:12px">Reply directly to this email to answer the customer.</p>`
  ),
});
