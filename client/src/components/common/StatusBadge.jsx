import {
  STATUS_LABELS, STATUS_STYLES, PAYMENT_LABELS, PAYMENT_STYLES, RESERVATION_STYLES,
} from "../../utils/constants";

// kind: "order" | "payment" | "reservation"
export default function StatusBadge({ kind = "order", value }) {
  let label = value;
  let style = "bg-gray-100 text-gray-700";

  if (kind === "order") {
    label = STATUS_LABELS[value] || value;
    style = STATUS_STYLES[value] || style;
  } else if (kind === "payment") {
    label = PAYMENT_LABELS[value] || value;
    style = PAYMENT_STYLES[value] || style;
  } else if (kind === "reservation") {
    label = value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
    style = RESERVATION_STYLES[value] || style;
  }

  return <span className={`badge ${style}`}>{label}</span>;
}
