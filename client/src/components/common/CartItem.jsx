import { useDispatch } from "react-redux";
import { FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { increaseQty, decreaseQty, removeFromCart, unitPrice, MAX_QTY } from "../../features/cart/cartSlice";
import { formatPrice } from "../../utils/formatPrice";
import FoodImage from "./FoodImage";
import VegMark from "./VegMark";

export default function CartItem({ item }) {
  const dispatch = useDispatch();

  return (
    <div className="flex gap-4 rounded-2xl bg-white p-3 shadow-sm sm:p-4">
      <FoodImage src={item.image} alt={item.name} className="h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-24" />

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div>
          <div className="flex items-start gap-2">
            {item.type === "menu" && (
              <span className="mt-1">
                <VegMark isVeg={item.isVeg} />
              </span>
            )}
            <h3 className="font-semibold text-choco">{item.name}</h3>
          </div>
          {item.addOns.length > 0 && (
            <p className="text-xs text-gray-500">+ {item.addOns.map((a) => a.name).join(", ")}</p>
          )}
          <p className="text-sm text-gray-600">{formatPrice(unitPrice(item))} each</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="inline-flex items-center rounded-full border border-gray-300">
            <button type="button" className="p-2 hover:text-brand" onClick={() => dispatch(decreaseQty(item.key))} aria-label="Decrease quantity">
              <FiMinus size={14} />
            </button>
            <span className="min-w-8 text-center text-sm font-semibold">{item.qty}</span>
            <button
              type="button"
              className="p-2 hover:text-brand disabled:opacity-40"
              disabled={item.qty >= MAX_QTY}
              onClick={() => dispatch(increaseQty(item.key))}
              aria-label="Increase quantity"
            >
              <FiPlus size={14} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold">{formatPrice(unitPrice(item) * item.qty)}</span>
            <button
              type="button"
              className="text-gray-400 hover:text-red-600"
              onClick={() => dispatch(removeFromCart(item.key))}
              aria-label="Remove item"
            >
              <FiTrash2 />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
