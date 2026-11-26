import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiCheckCircle } from "react-icons/fi";
import { fetchOrder } from "../features/orders/orderSlice";
import { formatPrice } from "../utils/formatPrice";
import { ORDER_TYPE_LABELS } from "../utils/constants";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import StatusBadge from "../components/common/StatusBadge";
import Seo from "../components/common/Seo";

export default function OrderSuccess() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: order, currentLoading, currentError } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrder(id));
  }, [dispatch, id]);

  if (currentLoading || (!order && !currentError)) return <Loader fullPage />;
  if (currentError || !order) {
    return <EmptyState title="Order not found" text={currentError} actionLabel="My orders" actionTo="/orders" />;
  }

  return (
    <div className="container-page flex justify-center py-12">
      <Seo title="Order placed" />
      <div className="card w-full max-w-lg space-y-5 p-8 text-center">
        <FiCheckCircle className="mx-auto text-leaf" size={64} />
        <div>
          <h1 className="text-2xl font-bold text-choco">Thank you, your order is placed</h1>
          <p className="mt-1 text-sm text-gray-500">
            Order number <span className="font-mono font-bold text-ink">{order.orderNumber}</span>
          </p>
        </div>

        <div className="space-y-2 rounded-2xl bg-cream p-4 text-left text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Type</span><span className="font-medium">{ORDER_TYPE_LABELS[order.orderType]}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Status</span><StatusBadge value={order.status} /></div>
          <div className="flex justify-between"><span className="text-gray-600">Payment</span><StatusBadge kind="payment" value={order.paymentStatus} /></div>
          <div className="flex justify-between border-t border-black/5 pt-2 text-base font-bold"><span>Total</span><span>{formatPrice(order.totalAmount)}</span></div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to={`/orders/${order._id}`} className="btn-primary flex-1">Track order</Link>
          <Link to="/menu" className="btn-outline flex-1">Order more</Link>
        </div>
      </div>
    </div>
  );
}
