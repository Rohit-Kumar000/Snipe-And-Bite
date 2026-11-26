import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiShoppingCart, FiTrash2 } from "react-icons/fi";
import { clearCart, selectCartSubtotal } from "../features/cart/cartSlice";
import { formatPrice } from "../utils/formatPrice";
import CartItem from "../components/common/CartItem";
import EmptyState from "../components/common/EmptyState";
import Seo from "../components/common/Seo";

export default function Cart() {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.cart.items);
  const subtotal = useSelector(selectCartSubtotal);
  const settings = useSelector((state) => state.settings.data);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FiShoppingCart />}
        title="Your cart is empty"
        text="Add some delicious food from the menu to get started."
        actionLabel="Browse menu"
        actionTo="/menu"
      />
    );
  }

  const belowMinimum = settings && subtotal < settings.minOrderAmount;

  return (
    <div className="container-page py-8">
      <Seo title="Cart" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-choco">Your cart</h1>
        <button type="button" className="btn-danger btn-sm" onClick={() => dispatch(clearCart())}>
          <FiTrash2 /> Clear cart
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {items.map((item) => (
            <CartItem key={item.key} item={item} />
          ))}
        </div>

        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-choco">Summary</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>
          <p className="text-xs text-gray-500">
            Taxes, delivery charge and coupons are calculated at checkout. Final prices are confirmed by the restaurant.
          </p>
          {belowMinimum && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              The minimum order amount is {formatPrice(settings.minOrderAmount)}. Add{" "}
              {formatPrice(settings.minOrderAmount - subtotal)} more to continue.
            </p>
          )}
          {belowMinimum ? (
            <button type="button" className="btn-primary w-full py-3" disabled>
              Proceed to checkout
            </button>
          ) : (
            <Link to="/checkout" className="btn-primary w-full py-3">
              Proceed to checkout
            </Link>
          )}
          <Link to="/menu" className="btn-ghost w-full">Add more items</Link>
        </aside>
      </div>
    </div>
  );
}
