import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { FiPlus, FiZap, FiHeart } from "react-icons/fi";
import { motion, useReducedMotion } from "framer-motion";
import { useSelector } from "react-redux";
import api from "../../services/api";
import { FaStar } from "react-icons/fa";
import { addToCart } from "../../features/cart/cartSlice";
import { setWishlistItem } from "../../features/auth/authSlice";
import { formatPrice } from "../../utils/formatPrice";
import FoodImage from "./FoodImage";
import VegMark from "./VegMark";
import CountdownTimer from "./CountdownTimer";

export default function FoodCard({ item, onWishlistChange }) {
  const dispatch = useDispatch();
  const hasAddOns = item.addOns?.length > 0;
  const user = useSelector((state) => state.auth.user);
  const reduce = useReducedMotion();
  const saved = Boolean(user?.wishlist?.some((id) => String(id) === String(item._id)));

  const handleAdd = () => {
    dispatch(
      addToCart({
        type: "menu",
        id: item._id,
        name: item.name,
        image: item.image?.url || "",
        isVeg: item.isVeg,
        price: item.currentPrice,
        addOns: [],
        qty: 1,
      })
    );
    toast.success(`${item.name} added to cart`);
  };

  const toggleSaved = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) return toast.error("Sign in to save favourites");
    try {
      const { data } = await api.put(`/users/wishlist/${item._id}`);
      dispatch(setWishlistItem({ itemId: item._id, saved: data.saved }));
      onWishlistChange?.(data.saved);
      toast.success(data.saved ? "Saved to your wishlist" : "Removed from your wishlist");
    } catch {
      toast.error("Could not update your wishlist");
    }
  };

  return (
    <motion.div whileHover={reduce ? undefined : { y: -6 }} whileTap={reduce ? undefined : { scale: 0.99 }} transition={{ type: "spring", stiffness: 320, damping: 24 }} className="card group relative flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl">
      <Link to={`/menu/${item._id}`} className="relative block overflow-hidden">
        <FoodImage src={item.image?.url} alt={item.name} className="h-44 w-full transition duration-500 group-hover:scale-105" />
        {item.isBestseller && (
          <span className="badge absolute left-3 top-3 bg-accent text-white">Bestseller</span>
        )}
        {item.isDealActive && (
          <span className="badge absolute right-3 top-3 bg-brand text-white">
            <FiZap /> <CountdownTimer endsAt={item.dealEndsAt} compact />
          </span>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white">
            Sold out
          </div>
        )}
      </Link>
      <button type="button" onClick={toggleSaved} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={saved} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-brand shadow transition hover:scale-110">
        <FiHeart size={18} fill={saved ? "currentColor" : "none"} />
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          <span className="mt-1">
            <VegMark isVeg={item.isVeg} />
          </span>
          <Link to={`/menu/${item._id}`} className="line-clamp-2 font-semibold text-choco hover:text-brand">
            {item.name}
          </Link>
        </div>

        <p className="line-clamp-2 text-xs text-gray-500">{item.description}</p>

        {item.numReviews > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <FaStar className="text-accent" /> {item.avgRating}
            <span className="text-gray-400">({item.numReviews})</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            <span className="text-lg font-bold text-ink">{formatPrice(item.currentPrice)}</span>
            {item.isDealActive && (
              <span className="ml-2 text-sm text-gray-400 line-through">{formatPrice(item.price)}</span>
            )}
          </div>

          {hasAddOns ? (
            <Link
              to={`/menu/${item._id}`}
              className={`btn-outline btn-sm ${!item.isAvailable ? "pointer-events-none opacity-50" : ""}`}
            >
              Customize
            </Link>
          ) : (
            <button type="button" className="btn-primary btn-sm" disabled={!item.isAvailable} onClick={handleAdd}>
              <FiPlus /> Add
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
