import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { fetchOrder, updateOrderStatus, updatePaymentStatus } from "../../features/orders/orderSlice";
import { formatPrice } from "../../utils/formatPrice";
import { formatDateTime } from "../../utils/formatDate";
import { ORDER_FLOWS, ORDER_TYPE_LABELS, STATUS_LABELS } from "../../utils/constants";
import OrderStatusStepper from "../../components/common/OrderStatusStepper";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import Seo from "../../components/common/Seo";

export default function OrderDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: order, currentLoading, currentError } = useSelector((state) => state.orders);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dispatch(fetchOrder(id));
  }, [dispatch, id]);

  if (currentLoading || (!order && !currentError)) return <Loader fullPage />;
  if (currentError || !order || order._id !== id) {
    return <EmptyState title="Order not found" text={currentError} actionLabel="All orders" actionTo="/admin/orders" />;
  }

  const flow = ORDER_FLOWS[order.orderType];
  const currentIndex = flow.indexOf(order.status);
  const open = !["delivered", "cancelled"].includes(order.status);
  const nextSteps = open ? flow.slice(currentIndex + 1) : [];
  const unpaidOnline = order.paymentMethod === "ONLINE" && order.paymentStatus !== "paid";

  const run = async (action, successMessage) => {
    setBusy(true);
    try {
      await dispatch(action).unwrap();
      toast.success(successMessage);
    } catch (message) {
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Seo title={`Order ${order.orderNumber}`} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/orders" className="text-sm text-gray-500 hover:text-brand">&larr; All orders</Link>
          <h1 className="font-mono text-2xl font-bold text-choco">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)} &middot; {ORDER_TYPE_LABELS[order.orderType]}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge value={order.status} />
          <StatusBadge kind="payment" value={order.paymentStatus} />
        </div>
      </div>

      <section className="card p-5 sm:p-6">
        <OrderStatusStepper order={order} />
      </section>

      {open && (
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold text-choco">Update status</h2>
          {unpaidOnline && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              This is an online order and the payment is not complete yet. It can move forward only after payment.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {nextSteps.map((step) => (
              <button
                key={step}
                type="button"
                className="btn-primary btn-sm"
                disabled={busy || unpaidOnline}
                onClick={() => run(updateOrderStatus({ id: order._id, status: step }), `Marked ${STATUS_LABELS[step].toLowerCase()}`)}
              >
                Mark {STATUS_LABELS[step].toLowerCase()}
              </button>
            ))}
            <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => setCancelOpen(true)}>
              Cancel order
            </button>
          </div>
        </section>
      )}

      {(order.paymentStatus === "refund_pending" || (order.paymentMethod === "COD" && order.paymentStatus !== "paid" && order.status !== "cancelled")) && (
        <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-gray-700">
            {order.paymentStatus === "refund_pending"
              ? "A refund is pending for this order. Mark it as refunded after you have returned the money."
              : "Cash payment has not been marked as received yet."}
          </p>
          {order.paymentStatus === "refund_pending" ? (
            <button type="button" className="btn-dark btn-sm" disabled={busy}
              onClick={() => run(updatePaymentStatus({ id: order._id, paymentStatus: "refunded" }), "Marked as refunded")}>
              Mark refunded
            </button>
          ) : (
            <button type="button" className="btn-dark btn-sm" disabled={busy}
              onClick={() => run(updatePaymentStatus({ id: order._id, paymentStatus: "paid" }), "Marked as paid")}>
              Mark cash received
            </button>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-choco">Items</h2>
          <ul className="divide-y divide-black/5">
            {order.items.map((item, index) => (
              <li key={index} className="flex justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-choco">{item.qty} x {item.name} {item.kind === "combo" && <span className="badge bg-leaf/15 text-leaf">Combo</span>}</p>
                  {item.addOns?.length > 0 && <p className="text-xs text-gray-500">+ {item.addOns.map((a) => a.name).join(", ")}</p>}
                </div>
                <span className="font-semibold">{formatPrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {order.note && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Customer note: {order.note}</p>}
        </section>

        <aside className="space-y-4">
          <section className="card space-y-1 p-5 text-sm">
            <h2 className="mb-1 font-semibold text-choco">Customer</h2>
            <p className="font-medium">{order.contact.name}</p>
            <a href={`tel:${order.contact.phone}`} className="text-brand hover:underline">{order.contact.phone}</a>
            {order.user?.email && <p className="text-gray-500">{order.user.email}</p>}
            {order.orderType === "delivery" && order.address && (
              <p className="pt-2 text-gray-600">
                {[order.address.line1, order.address.landmark, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(", ")}
              </p>
            )}
            {order.orderType === "dine-in" && <p className="pt-2 text-gray-600">Table {order.tableNumber}</p>}
          </section>

          <section className="card space-y-2 p-5 text-sm">
            <h2 className="mb-1 font-semibold text-choco">Bill</h2>
            <Row label="Items total" value={formatPrice(order.itemsTotal)} />
            {order.discount > 0 && <Row label={`Discount ${order.couponCode ? `(${order.couponCode})` : ""}`} value={`- ${formatPrice(order.discount)}`} />}
            {order.pointsRedeemed > 0 && <Row label="Loyalty points used" value={`- ${formatPrice(order.pointsRedeemed)}`} />}
            <Row label="Tax" value={formatPrice(order.tax)} />
            {order.deliveryCharge > 0 && <Row label="Delivery charge" value={formatPrice(order.deliveryCharge)} />}
            <div className="flex justify-between border-t border-black/5 pt-2 text-base font-bold">
              <span>Total</span><span>{formatPrice(order.totalAmount)}</span>
            </div>
            <p className="text-xs text-gray-500">
              {order.paymentMethod === "COD" ? "Cash payment" : `Online payment${order.razorpayPaymentId ? ` (${order.razorpayPaymentId})` : ""}`}
            </p>
          </section>
        </aside>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order?" size="sm">
        <p className="mb-3 text-sm text-gray-600">The customer will be notified. Paid online orders are refunded automatically when possible.</p>
        <textarea className="input" rows={3} maxLength={200} placeholder="Reason (shown to the customer)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setCancelOpen(false)}>Keep order</button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              await run(updateOrderStatus({ id: order._id, status: "cancelled", reason: reason.trim() || undefined }), "Order cancelled");
              setCancelOpen(false);
            }}
          >
            Cancel order
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
