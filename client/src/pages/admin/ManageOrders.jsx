import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiVolume2, FiVolumeX, FiRefreshCw } from "react-icons/fi";
import { fetchAdminOrders, updateOrderStatus } from "../../features/orders/orderSlice";
import { formatPrice } from "../../utils/formatPrice";
import { timeAgo } from "../../utils/formatDate";
import { playNewOrderSound } from "../../utils/sound";
import { ORDER_FLOWS, STATUS_LABELS, ORDER_TYPE_LABELS } from "../../utils/constants";
import StatusBadge from "../../components/common/StatusBadge";
import SearchBar from "../../components/common/SearchBar";
import Pagination from "../../components/common/Pagination";
import Loader from "../../components/common/Loader";
import Seo from "../../components/common/Seo";

const POLL_INTERVAL = 15000;
const TABS = ["", "placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"];

// The next status in the flow for the quick action button.
const nextStatus = (order) => {
  const flow = ORDER_FLOWS[order.orderType];
  const index = flow.indexOf(order.status);
  return index >= 0 && index < flow.length - 1 ? flow[index + 1] : null;
};

export default function ManageOrders() {
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const { admin: orders, adminPages, adminCounts, adminLoading } = useSelector((state) => state.orders);

  const status = params.get("status") || "";
  const type = params.get("type") || "";
  const search = params.get("search") || "";
  const date = params.get("date") || "";
  const page = Number(params.get("page")) || 1;

  const [soundOn, setSoundOn] = useState(true);
  const knownIds = useRef(null); // null until the first load finishes

  const load = useCallback(async () => {
    const result = await dispatch(fetchAdminOrders({ status, type, search, date, page, limit: 15 }));
    if (!fetchAdminOrders.fulfilled.match(result)) return;

    // Alert when an order that was not in the previous load shows up as a new "placed" order.
    const incoming = result.payload.orders;
    if (knownIds.current) {
      const fresh = incoming.filter((o) => !knownIds.current.has(o._id) && o.status === "placed");
      if (fresh.length > 0) {
        toast.success(`${fresh.length} new order${fresh.length > 1 ? "s" : ""} received`, { duration: 6000 });
        if (soundOn) playNewOrderSound();
      }
    }
    knownIds.current = new Set(incoming.map((o) => o._id));
  }, [dispatch, status, type, search, date, page, soundOn]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [load]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    knownIds.current = null; // a filter change must not trigger the new order alert
    setParams(next, { replace: true });
  };

  const advance = async (order) => {
    const target = nextStatus(order);
    if (!target) return;
    try {
      await dispatch(updateOrderStatus({ id: order._id, status: target })).unwrap();
      toast.success(`${order.orderNumber} is now ${STATUS_LABELS[target].toLowerCase()}`);
      load();
    } catch (message) {
      toast.error(message);
    }
  };

  const total = Object.values(adminCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-5">
      <Seo title="Orders" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-choco">Orders</h1>
          <p className="text-sm text-gray-500">This page refreshes automatically every 15 seconds.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={() => setSoundOn((on) => !on)}>
            {soundOn ? <FiVolume2 /> : <FiVolumeX />} Sound {soundOn ? "on" : "off"}
          </button>
          <button type="button" className="btn-outline btn-sm" onClick={load}><FiRefreshCw /> Refresh</button>
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((tab) => (
          <button
            key={tab || "all"}
            type="button"
            onClick={() => setFilter("status", tab)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              status === tab ? "border-brand bg-brand text-white" : "border-gray-300 bg-white text-choco"
            }`}
          >
            {tab ? STATUS_LABELS[tab] : "All"} ({tab ? adminCounts[tab] || 0 : total})
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
        <SearchBar value={search} onSearch={(value) => setFilter("search", value.trim())} placeholder="Search by order number, name or phone" />
        <select className="input" value={type} onChange={(e) => setFilter("type", e.target.value)}>
          <option value="">All order types</option>
          {Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input type="date" className="input" value={date} onChange={(e) => setFilter("date", e.target.value)} />
      </div>

      {adminLoading && orders.length === 0 ? (
        <Loader />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Type</th><th>Total</th><th>Payment</th><th>Status</th><th className="text-right">Action</th></tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-gray-500">No orders found.</td></tr>
              )}
              {orders.map((order) => {
                const target = nextStatus(order);
                const blocked = order.paymentMethod === "ONLINE" && order.paymentStatus !== "paid";
                return (
                  <tr key={order._id}>
                    <td>
                      <Link to={`/admin/orders/${order._id}`} className="font-mono font-bold text-choco hover:text-brand">{order.orderNumber}</Link>
                      <p className="text-xs text-gray-400">{timeAgo(order.createdAt)}</p>
                    </td>
                    <td>
                      <p className="font-medium">{order.contact.name}</p>
                      <p className="text-xs text-gray-500">{order.contact.phone}</p>
                    </td>
                    <td>
                      {ORDER_TYPE_LABELS[order.orderType]}
                      {order.orderType === "dine-in" && <span className="block text-xs text-gray-500">Table {order.tableNumber}</span>}
                    </td>
                    <td className="font-semibold">{formatPrice(order.totalAmount)}</td>
                    <td><StatusBadge kind="payment" value={order.paymentStatus} /></td>
                    <td><StatusBadge value={order.status} /></td>
                    <td>
                      <div className="flex justify-end gap-2">
                        {target && !blocked && (
                          <button type="button" className="btn-primary btn-sm" onClick={() => advance(order)}>
                            Mark {STATUS_LABELS[target].toLowerCase()}
                          </button>
                        )}
                        <Link to={`/admin/orders/${order._id}`} className="btn-ghost btn-sm">View</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={adminPages} onChange={(value) => setFilter("page", String(value))} />
    </div>
  );
}
