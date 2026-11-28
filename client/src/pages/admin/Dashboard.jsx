import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiShoppingBag, FiActivity, FiUsers, FiCalendar, FiCoffee, FiCreditCard, FiAlertTriangle } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { fetchStats, fetchSalesChart, fetchTopItems } from "../../features/admin/adminSlice";
import { formatPrice } from "../../utils/formatPrice";
import { STATUS_LABELS, STATUS_STYLES } from "../../utils/constants";
import StatCard from "../../components/admin/StatCard";
import SalesChart from "../../components/admin/SalesChart";
import Loader from "../../components/common/Loader";
import Seo from "../../components/common/Seo";

export default function Dashboard() {
  const dispatch = useDispatch();
  const { stats, statsLoading, chart, topItems, extra } = useSelector((state) => state.admin);
  const [days, setDays] = useState(7);

  useEffect(() => {
    dispatch(fetchStats());
    dispatch(fetchTopItems());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchSalesChart(days));
  }, [dispatch, days]);

  if (statsLoading && !stats) return <Loader fullPage />;
  if (!stats) return null;

  return (
    <div className="admin-dashboard space-y-6">
      <Seo title="Dashboard" />
      <div className="admin-dashboard-heading relative overflow-hidden rounded-3xl p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-8 -top-20 h-56 w-56 rounded-full bg-brand/15 blur-3xl" />
        <p className="eyebrow">Overview</p>
        <h1 className="relative mt-1 text-3xl font-bold text-choco sm:text-4xl">Dashboard</h1>
        <p className="text-sm text-gray-500">Cancelled orders and unpaid online orders are not counted in sales.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="admin-card-enter" style={{ "--card-index": 0 }}><StatCard icon={FiShoppingBag} label="Orders today" value={stats.todayOrders} tone="brand" /></div>
        <div className="admin-card-enter" style={{ "--card-index": 1 }}><StatCard icon={FaRupeeSign} label="Revenue today" value={formatPrice(stats.todayRevenue)} tone="leaf" /></div>
        <div className="admin-card-enter" style={{ "--card-index": 2 }}><StatCard icon={FiActivity} label="Active orders" value={stats.activeOrders} hint="Placed to out for delivery" tone="accent" /></div>
        <div className="admin-card-enter" style={{ "--card-index": 3 }}><StatCard icon={FiShoppingBag} label="Total orders" value={stats.totalOrders} tone="choco" /></div>
        <div className="admin-card-enter" style={{ "--card-index": 4 }}><StatCard icon={FaRupeeSign} label="Total revenue" value={formatPrice(stats.totalRevenue)} tone="leaf" /></div>
        <div className="admin-card-enter" style={{ "--card-index": 5 }}><StatCard icon={FiUsers} label="Customers" value={stats.customers} tone="brand" /></div>
      </div>

      {extra?.finance && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={FaRupeeSign} label="Revenue this month" value={formatPrice(extra.finance.monthRevenue)} tone="leaf" />
          <StatCard icon={FiCreditCard} label="Expenses this month" value={formatPrice(extra.finance.monthExpenses)} tone="accent" />
          <StatCard icon={FaRupeeSign} label="Profit this month" value={formatPrice(extra.finance.monthProfit)} hint="Revenue minus recorded expenses" tone={extra.finance.monthProfit >= 0 ? "leaf" : "brand"} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="card admin-card-enter min-w-0 overflow-hidden p-4 sm:p-5" style={{ "--card-index": 6 }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><p className="eyebrow">Performance</p><h2 className="mt-1 text-lg font-semibold text-choco">Revenue &amp; orders</h2></div>
            <div className="inline-flex rounded-full border border-gray-200 p-0.5 text-xs">
              {[7, 30].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDays(value)}
                  className={`rounded-full px-3 py-1.5 font-semibold transition ${days === value ? "bg-brand text-white shadow-sm" : "text-choco hover:bg-black/5"}`}
                >
                  {value} days
                </button>
              ))}
            </div>
          </div>
          <SalesChart data={chart} />
        </section>

        <section className="card admin-card-enter p-5" style={{ "--card-index": 7 }}>
          <h2 className="mb-4 font-semibold text-choco">Top selling items</h2>
          {topItems.length === 0 ? (
            <p className="text-sm text-gray-500">No sales yet.</p>
          ) : (
            <ol className="space-y-3">
              {topItems.map((item, index) => (
                <li key={item.name} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                  <span className="text-gray-500">{item.qty} sold</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {extra?.lowStockItems?.length > 0 && (
        <div className="grid gap-6">
          {extra.lowStockItems.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-choco"><FiAlertTriangle className="text-brand" /> Inventory alerts</h2>
              <ul className="space-y-2 text-sm">
                {extra.lowStockItems.map((item) => (
                  <li key={item._id} className="flex items-center justify-between gap-3"><span className="truncate font-medium">{item.name}</span><span className="shrink-0 font-semibold text-red-500">{Math.round(item.quantity * 100) / 100} {item.unit} left</span></li>
                ))}
              </ul>
              <Link to="/admin/inventory" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Open inventory</Link>
            </section>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold text-choco">Orders by status</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <Link key={status} to={`/admin/orders?status=${status}`} className={`badge px-3 py-1.5 ${STATUS_STYLES[status]}`}>
                {label}: {stats.statusBreakdown[status] || 0}
              </Link>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <StatCard icon={FiCalendar} label="Pending reservations" value={stats.pendingReservations} tone="accent" />
          <StatCard icon={FiCoffee} label="Items on menu" value={stats.availableItems} tone="leaf" />
        </section>
      </div>
    </div>
  );
}
