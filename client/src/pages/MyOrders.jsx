import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiPackage, FiRepeat } from "react-icons/fi";
import { fetchMyOrders } from "../features/orders/orderSlice";
import { addToCart } from "../features/cart/cartSlice";
import { formatPrice } from "../utils/formatPrice";
import { formatDateTime } from "../utils/formatDate";
import { ORDER_TYPE_LABELS } from "../utils/constants";
import StatusBadge from "../components/common/StatusBadge";
import Pagination from "../components/common/Pagination";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Seo from "../components/common/Seo";

export default function MyOrders() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mine, minePages, mineLoading } = useSelector((state) => state.orders);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchMyOrders({ page, limit: 8 }));
  }, [dispatch, page]);

  // Puts the items of an old order back in the cart. Prices are checked again at checkout.
  const reorder = (order) => {
    order.items.forEach((item) => {
      dispatch(
        addToCart({
          type: item.kind,
          id: item.kind === "combo" ? item.combo : item.menuItem,
          name: item.name,
          image: item.image,
          isVeg: item.isVeg,
          price: item.price,
          addOns: item.addOns || [],
          qty: item.qty,
        })
      );
    });
    toast.success("Items added to your cart");
    navigate("/cart");
  };

  if (mineLoading && mine.length === 0) return <Loader fullPage />;

  return (
    <div className="container-page py-8">
      <Seo title="My orders" />
      <h1 className="mb-6 text-3xl font-bold text-choco">My orders</h1>

      {mine.length === 0 ? (
        <EmptyState
          icon={<FiPackage />}
          title="No orders yet"
          text="When you place an order, it will show up here."
          actionLabel="Browse menu"
          actionTo="/menu"
        />
      ) : (
        <>
          <div className="space-y-4">
            {mine.map((order) => (
              <div key={order._id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link to={`/orders/${order._id}`} className="font-mono text-lg font-bold text-choco hover:text-brand">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(order.createdAt)} &middot; {ORDER_TYPE_LABELS[order.orderType]}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={order.status} />
                    <StatusBadge kind="payment" value={order.paymentStatus} />
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                  {order.items.map((i) => `${i.qty} x ${i.name}`).join(", ")}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-lg font-bold">{formatPrice(order.totalAmount)}</span>
                  <div className="flex gap-2">
                    <button type="button" className="btn-outline btn-sm" onClick={() => reorder(order)}>
                      <FiRepeat /> Reorder
                    </button>
                    <Link to={`/orders/${order._id}`} className="btn-primary btn-sm">View details</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pages={minePages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
