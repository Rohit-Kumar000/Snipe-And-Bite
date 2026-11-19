export const ORDER_FLOWS = {
  delivery: ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"],
  pickup: ["placed", "confirmed", "preparing", "ready", "delivered"],
  "dine-in": ["placed", "confirmed", "preparing", "ready", "delivered"],
};

export const STATUS_LABELS = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_STYLES = {
  placed: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-teal-100 text-teal-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export const PAYMENT_LABELS = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

export const PAYMENT_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  refund_pending: "bg-orange-100 text-orange-700",
  refunded: "bg-gray-200 text-gray-700",
};

export const ORDER_TYPE_LABELS = {
  delivery: "Home delivery",
  pickup: "Pickup",
  "dine-in": "Dine-in",
};

export const RESERVATION_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-gray-200 text-gray-700",
};

export const SORT_OPTIONS = [
  { value: "", label: "Recommended" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

export const LIGHT_LOGO_URL = "https://res.cloudinary.com/rohitk50798/image/upload/v1793564940/white-logo.png";
export const DARK_LOGO_URL = "https://res.cloudinary.com/rohitk50798/image/upload/v1793564941/black-logo.png";
// Keep this alias for components that use the logo on a permanently dark surface.
export const LOGO_URL = DARK_LOGO_URL;
export const FAVICON_URL = "https://res.cloudinary.com/rohitk50798/image/upload/v1793374357/favicon.png";
