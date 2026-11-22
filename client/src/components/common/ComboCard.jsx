import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { FiPlus } from "react-icons/fi";
import { addToCart } from "../../features/cart/cartSlice";
import { formatPrice } from "../../utils/formatPrice";
import FoodImage from "./FoodImage";

export default function ComboCard({ combo }) {
  const dispatch = useDispatch();
  const allAvailable = combo.items.every((i) => i.menuItem?.isAvailable);
  const available = combo.isAvailable && allAvailable;
  const saving = combo.originalPrice - combo.price;

  const handleAdd = () => {
    dispatch(
      addToCart({
        type: "combo",
        id: combo._id,
        name: combo.name,
        image: combo.image?.url || "",
        price: combo.price,
        addOns: [],
        qty: 1,
      })
    );
    toast.success(`${combo.name} added to cart`);
  };

  return (
    <div className="card flex flex-col overflow-hidden transition hover:shadow-md">
      <div className="relative">
        <FoodImage src={combo.image?.url} alt={combo.name} className="h-44 w-full" />
        {saving > 0 && (
          <span className="badge absolute left-3 top-3 bg-leaf text-white">Save {formatPrice(saving)}</span>
        )}
        {!available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white">
            Unavailable
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-choco">{combo.name}</h3>
        {combo.description && <p className="line-clamp-2 text-xs text-gray-500">{combo.description}</p>}

        <ul className="space-y-0.5 text-xs text-gray-600">
          {combo.items.map((i) => (
            <li key={i.menuItem?._id}>
              {i.qty} x {i.menuItem?.name}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            <span className="text-lg font-bold">{formatPrice(combo.price)}</span>
            {saving > 0 && (
              <span className="ml-2 text-sm text-gray-400 line-through">{formatPrice(combo.originalPrice)}</span>
            )}
          </div>
          <button type="button" className="btn-primary btn-sm" disabled={!available} onClick={handleAdd}>
            <FiPlus /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
