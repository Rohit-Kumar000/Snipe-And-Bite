import { format, formatDistanceToNow } from "date-fns";

export const formatDateTime = (value) => (value ? format(new Date(value), "dd MMM yyyy, h:mm a") : "");
export const formatDate = (value) => (value ? format(new Date(value), "dd MMM yyyy") : "");
export const timeAgo = (value) => (value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "");

// Converts an ISO date to the value format used by <input type="datetime-local">.
export const toLocalInputValue = (value) => (value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : "");

// Converts a 24 hour "HH:MM" string to "h:mm AM/PM".
export const formatClock = (time) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
};
