import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiDownload, FiStar } from "react-icons/fi";
import api, { getErrorMessage } from "../services/api";
import { fetchOrder, cancelOrder } from "../features/orders/orderSlice";
import { loadUser } from "../features/auth/authSlice";
import { payForOrder } from "../utils/razorpay";
import { getSocket } from "../services/socket";
import { formatPrice } from "../utils/formatPrice";
import { formatDateTime } from "../utils/formatDate";
import { ORDER_TYPE_LABELS } from "../utils/constants";
import OrderStatusStepper from "../components/common/OrderStatusStepper";
import StatusBadge from "../components/common/StatusBadge";
import Modal from "../components/common/Modal";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Seo from "../components/common/Seo";

const POLL_INTERVAL = 30000; // fallback only; live updates arrive through the socket

export default function OrderTracking() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { current: order, currentLoading, currentError } = useSelector((state) => state.orders);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dispatch(fetchOrder(id));
  }, [dispatch, id]);

  // Live updates: the server pushes every status change for this customer's orders.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onUpdate = (payload) => { if (payload.orderId === id) dispatch(fetchOrder(id)); };
    socket.on("order:update", onUpdate);
    return () => socket.off("order:update", onUpdate);
  }, [dispatch, id]);

  // Safety net: refresh every 30 seconds until it is delivered or cancelled.
  const finished = order && ["delivered", "cancelled"].includes(order.status);
  useEffect(() => {
    if (!order || finished) return undefined;
    const timer = setInterval(() => dispatch(fetchOrder(id)), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [dispatch, id, order, finished]);

  if (currentLoading || (!order && !currentError)) return <Loader fullPage />;
  if (currentError || !order || order._id !== id) {
    return <EmptyState title="Order not found" text={currentError} actionLabel="My orders" actionTo="/orders" />;
  }

  const canCancel = ["placed", "confirmed"].includes(order.status);
  const needsPayment =
    order.paymentMethod === "ONLINE" &&
    ["pending", "failed"].includes(order.paymentStatus) &&
    order.status !== "cancelled";

  const handleCancel = async () => {
    setBusy(true);
    try {
      await dispatch(cancelOrder({ id: order._id, reason: reason.trim() || undefined })).unwrap();
      toast.success("Order cancelled");
      setCancelOpen(false);
      dispatch(loadUser());
    } catch (message) {
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handlePay = async () => {
    setBusy(true);
    try {
      const result = await payForOrder(order, user);
      if (result.paid) {
        toast.success("Payment successful");
        dispatch(fetchOrder(id));
      } else {
        toast.error("Payment was not completed");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const downloadInvoice = async () => {
    try {
      const { data } = await api.get(`/orders/${order._id}/invoice`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${order.orderNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the invoice");
    }
  };

  return (
    <div className="container-page py-8">
      <Seo title={`Order ${order.orderNumber}`} />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/orders" className="text-sm text-gray-500 hover:text-brand">&larr; All orders</Link>
          <h1 className="font-mono text-2xl font-bold text-choco">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            {formatDateTime(order.createdAt)} &middot; {ORDER_TYPE_LABELS[order.orderType]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={order.status} />
          <StatusBadge kind="payment" value={order.paymentStatus} />
        </div>
      </div>

      {needsPayment && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4">
          <p className="text-sm text-amber-900">Payment for this order is pending. Complete it so the restaurant can start preparing.</p>
          <button type="button" className="btn-primary" onClick={handlePay} disabled={busy}>
            Pay {formatPrice(order.totalAmount)}
          </button>
        </div>
      )}

      <section className="card mb-6 p-5 sm:p-6">
        <OrderStatusStepper order={order} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-choco">Items</h2>
          <ul className="divide-y divide-black/5">
            {order.items.map((item, index) => (
              <li key={index} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-choco">
                    {item.qty} x {item.name}
                  </p>
                  {item.addOns?.length > 0 && (
                    <p className="text-xs text-gray-500">+ {item.addOns.map((a) => a.name).join(", ")}</p>
                  )}
                  {order.status === "delivered" && item.kind === "menu" && (
                    <Link to={`/menu/${item.menuItem}#reviews`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                      <FiStar /> Rate this dish
                    </Link>
                  )}
                </div>
                <span className="font-semibold">{formatPrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-4">
          <section className="card space-y-2 p-5 text-sm">
            <h2 className="mb-1 font-semibold text-choco">Bill</h2>
            <Line label="Items total" value={formatPrice(order.itemsTotal)} />
            {order.discount > 0 && <Line label={`Discount ${order.couponCode ? `(${order.couponCode})` : ""}`} value={`- ${formatPrice(order.discount)}`} />}
            {order.pointsRedeemed > 0 && <Line label="Loyalty points" value={`- ${formatPrice(order.pointsRedeemed)}`} />}
            <Line label="Tax" value={formatPrice(order.tax)} />
            {order.deliveryCharge > 0 && <Line label="Delivery charge" value={formatPrice(order.deliveryCharge)} />}
            <div className="flex justify-between border-t border-black/5 pt-2 text-base font-bold">
              <span>Total</span><span>{formatPrice(order.totalAmount)}</span>
            </div>
            <p className="text-xs text-gray-500">Payment method: {order.paymentMethod === "COD" ? "Cash" : "Online"}</p>
          </section>

          <section className="card space-y-1 p-5 text-sm">
            <h2 className="mb-1 font-semibold text-choco">Details</h2>
            <p>{order.contact.name} &middot; {order.contact.phone}</p>
            {order.orderType === "delivery" && order.address && (
              <p className="text-gray-600">
                {[order.address.line1, order.address.landmark, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(", ")}
              </p>
            )}
            {order.orderType === "dine-in" && <p className="text-gray-600">Table {order.tableNumber}</p>}
            {order.note && <p className="text-gray-600">Note: {order.note}</p>}
          </section>

          <div className="flex flex-col gap-2">
            {order.status !== "cancelled" && (
              <button type="button" className="btn-outline" onClick={downloadInvoice}>
                <FiDownload /> Download invoice
              </button>
            )}
            {canCancel && (
              <button type="button" className="btn-danger" onClick={() => setCancelOpen(true)}>
                Cancel order
              </button>
            )}
          </div>
        </aside>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order?" size="sm">
        <p className="mb-3 text-sm text-gray-600">
          Orders can be cancelled only before preparation starts. Paid online orders are refunded to the original payment method.
        </p>
        <textarea className="input" rows={3} maxLength={200} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setCancelOpen(false)}>Keep order</button>
          <button type="button" className="btn-primary" onClick={handleCancel} disabled={busy}>
            {busy ? "Cancelling..." : "Yes, cancel order"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
