import { FiCheck, FiXCircle } from "react-icons/fi";
import { ORDER_FLOWS, STATUS_LABELS } from "../../utils/constants";
import { formatDateTime } from "../../utils/formatDate";

// Shows the progress of an order, using the steps that match its type.
export default function OrderStatusStepper({ order }) {
  if (order.status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
        <FiXCircle size={26} />
        <div>
          <p className="font-semibold">This order was cancelled</p>
          {order.cancelReason && <p className="text-sm">{order.cancelReason}</p>}
        </div>
      </div>
    );
  }

  const steps = ORDER_FLOWS[order.orderType];
  const currentIndex = steps.indexOf(order.status);
  const historyMap = Object.fromEntries((order.statusHistory || []).map((h) => [h.status, h.at]));

  return (
    <ol className="grid gap-4 sm:grid-cols-5 sm:gap-2">
      {steps.map((step, index) => {
        const done = index <= currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step} className="flex items-center gap-3 sm:flex-col sm:text-center">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                done ? "border-leaf bg-leaf text-white" : "border-gray-300 bg-white text-gray-400"
              } ${active && step !== "delivered" ? "ring-4 ring-leaf/20" : ""}`}
            >
              {done ? <FiCheck size={18} /> : index + 1}
            </span>
            <span>
              <span className={`block text-sm font-semibold ${done ? "text-choco" : "text-gray-400"}`}>
                {STATUS_LABELS[step]}
              </span>
              {historyMap[step] && (
                <span className="block text-xs text-gray-500">{formatDateTime(historyMap[step])}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
